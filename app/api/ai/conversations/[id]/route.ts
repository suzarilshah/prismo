/**
 * AI Conversation Detail API
 * 
 * Manages individual conversation operations.
 * 
 * Endpoints:
 * - GET /api/ai/conversations/[id] - Get conversation with messages
 * - PATCH /api/ai/conversations/[id] - Update conversation (title, archive)
 * - DELETE /api/ai/conversations/[id] - Delete conversation
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { aiConversations, aiMessages } from "@/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { getSession } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/ai/conversations/[id] - Get conversation with messages
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id: conversationId } = await params;
    const userId = session.user.id;
    const { searchParams } = new URL(request.url);

    // Pagination for messages
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;
    const order = searchParams.get("order") || "asc"; // asc = oldest first (chat style)

    // Fetch conversation
    const [conversation] = await db
      .select()
      .from(aiConversations)
      .where(
        and(
          eq(aiConversations.id, conversationId),
          eq(aiConversations.userId, userId)
        )
      )
      .limit(1);

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Fetch messages
    const messages = await db
      .select({
        id: aiMessages.id,
        role: aiMessages.role,
        content: aiMessages.content,
        retrievedData: aiMessages.retrievedData,
        dataSources: aiMessages.dataSources,
        confidenceScore: aiMessages.confidenceScore,
        tokensUsed: aiMessages.tokensUsed,
        processingTimeMs: aiMessages.processingTimeMs,
        queryRewritten: aiMessages.queryRewritten,
        originalQuery: aiMessages.originalQuery,
        createdAt: aiMessages.createdAt,
      })
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, conversationId))
      .orderBy(order === "asc" ? asc(aiMessages.createdAt) : desc(aiMessages.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: {
        conversation: {
          id: conversation.id,
          title: conversation.title,
          totalMessages: conversation.totalMessages,
          totalTokensUsed: conversation.totalTokensUsed,
          isArchived: conversation.isArchived,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        },
        messages,
        pagination: {
          page,
          limit,
          hasMore: messages.length === limit,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversation" },
      { status: 500 }
    );
  }
}

// PATCH /api/ai/conversations/[id] - Update conversation
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id: conversationId } = await params;
    const userId = session.user.id;
    const body = await request.json();

    // Verify ownership
    const [existing] = await db
      .select({ id: aiConversations.id })
      .from(aiConversations)
      .where(
        and(
          eq(aiConversations.id, conversationId),
          eq(aiConversations.userId, userId)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (body.title !== undefined) {
      updateData.title = body.title;
    }
    if (body.isArchived !== undefined) {
      updateData.isArchived = body.isArchived;
    }

    const [updated] = await db
      .update(aiConversations)
      .set(updateData)
      .where(eq(aiConversations.id, conversationId))
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        title: updated.title,
        isArchived: updated.isArchived,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error updating conversation:", error);
    return NextResponse.json(
      { error: "Failed to update conversation" },
      { status: 500 }
    );
  }
}

// DELETE /api/ai/conversations/[id] - Delete conversation
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id: conversationId } = await params;
    const userId = session.user.id;

    // Verify ownership and delete (messages deleted via cascade)
    const result = await db
      .delete(aiConversations)
      .where(
        and(
          eq(aiConversations.id, conversationId),
          eq(aiConversations.userId, userId)
        )
      )
      .returning({ id: aiConversations.id });

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Conversation deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    );
  }
}
