/**
 * AI Conversations API
 * 
 * Manages conversation sessions for the AI assistant.
 * 
 * Endpoints:
 * - GET /api/ai/conversations - List all conversations
 * - POST /api/ai/conversations - Create a new conversation
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { aiConversations, aiMessages, aiSettings } from "@/db/schema";
import { eq, desc, and, count } from "drizzle-orm";
import { getSession } from "@/lib/auth";

// GET /api/ai/conversations - List user's conversations
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    
    // Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;
    
    // Filter
    const includeArchived = searchParams.get("includeArchived") === "true";

    // Build query
    const conditions = [eq(aiConversations.userId, userId)];
    if (!includeArchived) {
      conditions.push(eq(aiConversations.isArchived, false));
    }

    // Fetch conversations with latest message preview
    const conversations = await db
      .select({
        id: aiConversations.id,
        title: aiConversations.title,
        totalMessages: aiConversations.totalMessages,
        totalTokensUsed: aiConversations.totalTokensUsed,
        isArchived: aiConversations.isArchived,
        createdAt: aiConversations.createdAt,
        updatedAt: aiConversations.updatedAt,
      })
      .from(aiConversations)
      .where(and(...conditions))
      .orderBy(desc(aiConversations.updatedAt))
      .limit(limit)
      .offset(offset);

    // Get last message for each conversation
    const conversationsWithPreview = await Promise.all(
      conversations.map(async (conv) => {
        const [lastMessage] = await db
          .select({
            content: aiMessages.content,
            role: aiMessages.role,
            createdAt: aiMessages.createdAt,
          })
          .from(aiMessages)
          .where(eq(aiMessages.conversationId, conv.id))
          .orderBy(desc(aiMessages.createdAt))
          .limit(1);

        return {
          ...conv,
          lastMessage: lastMessage ? {
            preview: lastMessage.content.slice(0, 100) + (lastMessage.content.length > 100 ? "..." : ""),
            role: lastMessage.role,
            createdAt: lastMessage.createdAt,
          } : null,
        };
      })
    );

    // Get total count for pagination
    const [{ value: totalCount }] = await db
      .select({ value: count() })
      .from(aiConversations)
      .where(and(...conditions));

    return NextResponse.json({
      success: true,
      data: {
        conversations: conversationsWithPreview,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

// POST /api/ai/conversations - Create a new conversation
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    // Check if AI is enabled for user
    const [settings] = await db
      .select({ aiEnabled: aiSettings.aiEnabled })
      .from(aiSettings)
      .where(eq(aiSettings.userId, userId))
      .limit(1);

    if (!settings?.aiEnabled) {
      return NextResponse.json(
        { error: "AI assistant is not enabled. Please configure it in settings." },
        { status: 403 }
      );
    }

    // Create conversation
    const [conversation] = await db
      .insert(aiConversations)
      .values({
        userId,
        title: body.title || "New Conversation",
        totalMessages: 0,
        totalTokensUsed: 0,
        isArchived: false,
      })
      .returning();

    // If an initial message is provided, add it
    if (body.initialMessage) {
      await db.insert(aiMessages).values({
        conversationId: conversation.id,
        role: "user",
        content: body.initialMessage,
      });

      // Update message count
      await db
        .update(aiConversations)
        .set({ 
          totalMessages: 1,
          updatedAt: new Date(),
        })
        .where(eq(aiConversations.id, conversation.id));
    }

    return NextResponse.json({
      success: true,
      data: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}
