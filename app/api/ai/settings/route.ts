import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { aiSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";
import { 
  encryptApiKey, 
  decryptApiKey, 
  maskApiKey,
  DEFAULT_AI_SETTINGS,
  type AISettings,
  type AIDataAccessPermissions,
} from "@/lib/ai/security";

// GET /api/ai/settings - Get user's AI settings
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = authUser.id;

    // Fetch AI settings for user
    const [settings] = await db
      .select()
      .from(aiSettings)
      .where(eq(aiSettings.userId, userId))
      .limit(1);

    if (!settings) {
      // Return default settings if none exist
      return NextResponse.json({
        success: true,
        data: {
          ...DEFAULT_AI_SETTINGS,
          hasApiKey: false,
          maskedApiKey: null,
        },
      });
    }

    // Mask the API key for security
    let maskedApiKey: string | null = null;
    if (settings.apiKeyEncrypted) {
      try {
        const decrypted = decryptApiKey(settings.apiKeyEncrypted);
        maskedApiKey = maskApiKey(decrypted);
      } catch {
        maskedApiKey = '••••••••';
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        aiEnabled: settings.aiEnabled,
        provider: settings.provider,
        modelEndpoint: settings.modelEndpoint,
        modelName: settings.modelName,
        temperature: parseFloat(settings.temperature || "0.7"),
        maxTokens: settings.maxTokens,
        enableCrag: settings.enableCrag,
        relevanceThreshold: parseFloat(settings.relevanceThreshold || "0.7"),
        maxRetrievalDocs: settings.maxRetrievalDocs,
        enableWebSearchFallback: settings.enableWebSearchFallback,
        dataAccess: settings.dataAccess || DEFAULT_AI_SETTINGS.dataAccess,
        anonymizeVendors: settings.anonymizeVendors,
        excludeSensitiveCategories: settings.excludeSensitiveCategories || [],
        hasApiKey: !!settings.apiKeyEncrypted,
        maskedApiKey,
      },
    });
  } catch (error) {
    console.error("Error fetching AI settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch AI settings" },
      { status: 500 }
    );
  }
}

// POST /api/ai/settings - Create or update AI settings
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = authUser.id;
    const body = await request.json();

    // Validate provider if provided
    const validProviders = ['azure_foundry', 'openai', 'anthropic'];
    if (body.provider && !validProviders.includes(body.provider)) {
      return NextResponse.json(
        { error: "Invalid provider. Must be one of: azure_foundry, openai, anthropic" },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    // Handle each field explicitly
    if (body.aiEnabled !== undefined) {
      updateData.aiEnabled = body.aiEnabled;
    }
    if (body.provider !== undefined) {
      updateData.provider = body.provider;
    }
    if (body.modelEndpoint !== undefined) {
      updateData.modelEndpoint = body.modelEndpoint || null;
    }
    if (body.modelName !== undefined) {
      updateData.modelName = body.modelName || null;
    }
    
    // Encrypt API key if provided
    if (body.apiKey !== undefined) {
      if (body.apiKey) {
        updateData.apiKeyEncrypted = encryptApiKey(body.apiKey);
      } else {
        updateData.apiKeyEncrypted = null;
      }
    }

    // Model settings
    if (body.temperature !== undefined) {
      updateData.temperature = body.temperature.toString();
    }
    if (body.maxTokens !== undefined) {
      updateData.maxTokens = body.maxTokens;
    }

    // RAG settings
    if (body.enableCrag !== undefined) {
      updateData.enableCrag = body.enableCrag;
    }
    if (body.relevanceThreshold !== undefined) {
      updateData.relevanceThreshold = body.relevanceThreshold.toString();
    }
    if (body.maxRetrievalDocs !== undefined) {
      updateData.maxRetrievalDocs = body.maxRetrievalDocs;
    }
    if (body.enableWebSearchFallback !== undefined) {
      updateData.enableWebSearchFallback = body.enableWebSearchFallback;
    }

    // Data access permissions
    if (body.dataAccess !== undefined) {
      updateData.dataAccess = body.dataAccess;
    }

    // Privacy settings
    if (body.anonymizeVendors !== undefined) {
      updateData.anonymizeVendors = body.anonymizeVendors;
    }
    if (body.excludeSensitiveCategories !== undefined) {
      updateData.excludeSensitiveCategories = body.excludeSensitiveCategories;
    }

    // Check if settings exist
    const [existing] = await db
      .select({ id: aiSettings.id })
      .from(aiSettings)
      .where(eq(aiSettings.userId, userId))
      .limit(1);

    let result;
    if (existing) {
      // Update existing settings
      [result] = await db
        .update(aiSettings)
        .set(updateData)
        .where(eq(aiSettings.userId, userId))
        .returning();
    } else {
      // Create new settings
      [result] = await db
        .insert(aiSettings)
        .values({
          userId,
          ...updateData,
        })
        .returning();
    }

    // Mask the API key for response
    let maskedApiKey: string | null = null;
    if (result.apiKeyEncrypted) {
      try {
        const decrypted = decryptApiKey(result.apiKeyEncrypted);
        maskedApiKey = maskApiKey(decrypted);
      } catch {
        maskedApiKey = '••••••••';
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        aiEnabled: result.aiEnabled,
        provider: result.provider,
        modelEndpoint: result.modelEndpoint,
        modelName: result.modelName,
        temperature: parseFloat(result.temperature || "0.7"),
        maxTokens: result.maxTokens,
        enableCrag: result.enableCrag,
        relevanceThreshold: parseFloat(result.relevanceThreshold || "0.7"),
        maxRetrievalDocs: result.maxRetrievalDocs,
        enableWebSearchFallback: result.enableWebSearchFallback,
        dataAccess: result.dataAccess || DEFAULT_AI_SETTINGS.dataAccess,
        anonymizeVendors: result.anonymizeVendors,
        excludeSensitiveCategories: result.excludeSensitiveCategories || [],
        hasApiKey: !!result.apiKeyEncrypted,
        maskedApiKey,
      },
    });
  } catch (error) {
    console.error("Error saving AI settings:", error);
    return NextResponse.json(
      { error: "Failed to save AI settings" },
      { status: 500 }
    );
  }
}

// DELETE /api/ai/settings - Delete AI settings (reset to defaults)
export async function DELETE(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = authUser.id;

    await db
      .delete(aiSettings)
      .where(eq(aiSettings.userId, userId));

    return NextResponse.json({
      success: true,
      message: "AI settings reset to defaults",
    });
  } catch (error) {
    console.error("Error deleting AI settings:", error);
    return NextResponse.json(
      { error: "Failed to reset AI settings" },
      { status: 500 }
    );
  }
}
