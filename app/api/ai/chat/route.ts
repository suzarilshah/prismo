/**
 * AI Chat API
 * 
 * Main chat endpoint for the AI assistant.
 * Supports both regular and streaming responses.
 * 
 * Endpoints:
 * - POST /api/ai/chat - Send a message and get AI response
 * 
 * Features:
 * - Server-Sent Events (SSE) streaming
 * - CRAG pipeline integration
 * - Conversation history management
 * - Rate limiting
 * - Usage tracking
 */

import { NextRequest } from "next/server";
import { db } from "@/db";
import { aiConversations, aiMessages, aiSettings, users } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { decryptApiKey } from "@/lib/ai/security";
import { createAIClient, AIProvider } from "@/lib/ai/clients";
import { createAgenticRAG } from "@/lib/ai/agentic-rag";
import { ChatMessage } from "@/lib/ai/clients/types";

interface ChatRequest {
  conversationId?: string;
  message: string;
  stream?: boolean;
}

// Rate limiting - simple in-memory store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20; // messages per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    rateLimitStore.set(userId, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }

  userLimit.count++;
  return true;
}

// POST /api/ai/chat - Chat with AI
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;
    const body: ChatRequest = await request.json();

    // Validate input
    if (!body.message || typeof body.message !== "string") {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    if (body.message.length > 4000) {
      return Response.json(
        { error: "Message too long. Maximum 4000 characters." },
        { status: 400 }
      );
    }

    // Rate limiting
    if (!checkRateLimit(userId)) {
      return Response.json(
        { error: "Rate limit exceeded. Please wait a moment." },
        { status: 429 }
      );
    }

    // Fetch AI settings
    const [settings] = await db
      .select()
      .from(aiSettings)
      .where(eq(aiSettings.userId, userId))
      .limit(1);

    if (!settings?.aiEnabled) {
      return Response.json(
        { error: "AI assistant is not enabled. Please configure it in settings." },
        { status: 403 }
      );
    }

    if (!settings.apiKeyEncrypted) {
      return Response.json(
        { error: "API key not configured. Please add your API key in settings." },
        { status: 400 }
      );
    }

    // Decrypt API key
    let apiKey: string;
    try {
      apiKey = decryptApiKey(settings.apiKeyEncrypted);
    } catch {
      return Response.json(
        { error: "Failed to decrypt API key. Please reconfigure." },
        { status: 500 }
      );
    }

    // Get or create conversation
    let conversationId = body.conversationId;
    if (!conversationId) {
      // Create new conversation
      const [newConversation] = await db
        .insert(aiConversations)
        .values({
          userId,
          title: body.message.slice(0, 50) + (body.message.length > 50 ? "..." : ""),
          totalMessages: 0,
          totalTokensUsed: 0,
        })
        .returning();
      conversationId = newConversation.id;
    } else {
      // Verify conversation ownership
      const [conv] = await db
        .select({ id: aiConversations.id })
        .from(aiConversations)
        .where(
          and(
            eq(aiConversations.id, conversationId),
            eq(aiConversations.userId, userId)
          )
        )
        .limit(1);

      if (!conv) {
        return Response.json(
          { error: "Conversation not found" },
          { status: 404 }
        );
      }
    }

    // Save user message
    await db.insert(aiMessages).values({
      conversationId,
      role: "user",
      content: body.message,
    });

    // Get conversation history for context
    const history = await db
      .select({
        role: aiMessages.role,
        content: aiMessages.content,
      })
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, conversationId))
      .orderBy(desc(aiMessages.createdAt))
      .limit(10); // Last 10 messages for context

    // Reverse to chronological order
    const conversationHistory: ChatMessage[] = history.reverse().map((msg) => ({
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content,
    }));

    // Create AI client
    const client = createAIClient({
      provider: settings.provider as AIProvider,
      apiKey,
      modelName: settings.modelName || "gpt-4o",
      endpoint: settings.modelEndpoint || undefined,
      defaultOptions: {
        temperature: parseFloat(settings.temperature || "0.7"),
        maxTokens: settings.maxTokens || 2048,
      },
    });

    // Determine if streaming is requested
    const useStreaming = body.stream !== false;

    if (useStreaming && client.chatStream) {
      // Streaming response
      return handleStreamingResponse(
        client,
        settings,
        userId,
        conversationId,
        body.message,
        conversationHistory
      );
    } else {
      // Non-streaming response
      return handleNonStreamingResponse(
        client,
        settings,
        userId,
        conversationId,
        body.message,
        conversationHistory
      );
    }
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json(
      { error: "An error occurred while processing your request" },
      { status: 500 }
    );
  }
}

/**
 * Handle non-streaming response
 */
async function handleNonStreamingResponse(
  client: ReturnType<typeof createAIClient>,
  settings: any,
  userId: string,
  conversationId: string,
  message: string,
  conversationHistory: ChatMessage[]
): Promise<Response> {
  // Create Agentic RAG (simplified, single LLM call)
  const agent = createAgenticRAG(client, {
    maxTokens: settings.maxTokens || 2048,
    temperature: parseFloat(settings.temperature || "0.7"),
    enableFallback: true, // Use data-driven fallback if LLM fails
  });

  // Process through Agentic RAG pipeline
  const result = await agent.process(message, userId, {
    conversationHistory,
    dataAccessPermissions: settings.dataAccess,
  });

  // Save assistant message
  await db.insert(aiMessages).values({
    conversationId,
    role: "assistant",
    content: result.content,
    retrievedData: {
      tables: result.metadata.dataSources,
      recordCount: result.metadata.recordsAnalyzed,
      summary: `Analyzed ${result.metadata.recordsAnalyzed} records from ${result.metadata.dataSources.join(', ')}`,
    },
    dataSources: result.metadata.dataSources,
    confidenceScore: result.metadata.confidence.toFixed(2),
    tokensUsed: 0, // Will be updated when we add token counting
    processingTimeMs: result.metadata.processingTimeMs,
    queryRewritten: false,
    originalQuery: null,
  });

  // Update conversation stats
  await db
    .update(aiConversations)
    .set({
      totalMessages: sql`${aiConversations.totalMessages} + 2`,
      totalTokensUsed: sql`${aiConversations.totalTokensUsed} + 0`,
      updatedAt: new Date(),
    })
    .where(eq(aiConversations.id, conversationId));

  return Response.json({
    success: true,
    data: {
      conversationId,
      message: {
        role: "assistant",
        content: result.content,
      },
      metadata: {
        intent: result.metadata.intent,
        dataSources: result.metadata.dataSources,
        confidenceScore: result.metadata.confidence,
        recordsAnalyzed: result.metadata.recordsAnalyzed,
        latencyMs: result.metadata.processingTimeMs,
        fallbackUsed: result.fallbackUsed,
      },
    },
  });
}

/**
 * Handle streaming response with SSE
 */
async function handleStreamingResponse(
  client: ReturnType<typeof createAIClient>,
  settings: any,
  userId: string,
  conversationId: string,
  message: string,
  conversationHistory: ChatMessage[]
): Promise<Response> {
  const encoder = new TextEncoder();

  // Create a readable stream
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send initial event
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "start", conversationId })}\n\n`)
        );

        // Create Agentic RAG
        const agent = createAgenticRAG(client, {
          maxTokens: settings.maxTokens || 2048,
          temperature: parseFloat(settings.temperature || "0.7"),
          enableFallback: true,
        });

        // Process through Agentic RAG pipeline
        const result = await agent.process(message, userId, {
          conversationHistory,
          dataAccessPermissions: settings.dataAccess,
        });

        // Stream the content in chunks
        const chunkSize = 20; // Characters per chunk
        const content = result.content;
        
        for (let i = 0; i < content.length; i += chunkSize) {
          const chunk = content.slice(i, i + chunkSize);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`)
          );
          // Small delay for natural typing effect
          await new Promise((resolve) => setTimeout(resolve, 10));
        }

        // Send metadata
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "metadata",
              intent: result.metadata.intent,
              dataSources: result.metadata.dataSources,
              confidenceScore: result.metadata.confidence,
              recordsAnalyzed: result.metadata.recordsAnalyzed,
              latencyMs: result.metadata.processingTimeMs,
              fallbackUsed: result.fallbackUsed,
            })}\n\n`
          )
        );

        // Save assistant message
        await db.insert(aiMessages).values({
          conversationId,
          role: "assistant",
          content: result.content,
          retrievedData: {
            tables: result.metadata.dataSources,
            recordCount: result.metadata.recordsAnalyzed,
            summary: `Analyzed ${result.metadata.recordsAnalyzed} records`,
          },
          dataSources: result.metadata.dataSources,
          confidenceScore: result.metadata.confidence.toFixed(2),
          tokensUsed: 0,
          processingTimeMs: result.metadata.processingTimeMs,
          queryRewritten: false,
          originalQuery: null,
        });

        // Update conversation stats
        await db
          .update(aiConversations)
          .set({
            totalMessages: sql`${aiConversations.totalMessages} + 2`,
            totalTokensUsed: sql`${aiConversations.totalTokensUsed} + 0`,
            updatedAt: new Date(),
          })
          .where(eq(aiConversations.id, conversationId));

        // Send done event
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
        );

        controller.close();
      } catch (error) {
        console.error("Streaming error:", error);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              message: "An error occurred while processing your request",
            })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
