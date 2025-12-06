import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { aiSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/auth";
import { decryptApiKey } from "@/lib/ai/security";

interface TestConnectionRequest {
  provider: 'azure_foundry' | 'openai' | 'anthropic';
  modelEndpoint: string;
  modelName: string;
  apiKey?: string; // Optional - if not provided, use stored key
}

// POST /api/ai/test-connection - Test AI provider connection
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = authUser.id;
    const body: TestConnectionRequest = await request.json();

    // Validate required fields
    if (!body.provider || !body.modelEndpoint || !body.modelName) {
      return NextResponse.json(
        { error: "Missing required fields: provider, modelEndpoint, modelName" },
        { status: 400 }
      );
    }

    // Get API key - either from request or from stored settings
    let apiKey = body.apiKey;
    
    if (!apiKey) {
      // Try to get from stored settings
      const [settings] = await db
        .select({ apiKeyEncrypted: aiSettings.apiKeyEncrypted })
        .from(aiSettings)
        .where(eq(aiSettings.userId, userId))
        .limit(1);

      if (settings?.apiKeyEncrypted) {
        try {
          apiKey = decryptApiKey(settings.apiKeyEncrypted);
        } catch {
          return NextResponse.json(
            { error: "Failed to decrypt stored API key" },
            { status: 500 }
          );
        }
      }
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "No API key provided or stored" },
        { status: 400 }
      );
    }

    // Test connection based on provider
    const startTime = Date.now();
    let testResult: { success: boolean; message: string; latencyMs?: number; modelInfo?: any };

    try {
      switch (body.provider) {
        case 'azure_foundry':
          testResult = await testAzureFoundry(body.modelEndpoint, body.modelName, apiKey);
          break;
        case 'openai':
          testResult = await testOpenAI(body.modelEndpoint, body.modelName, apiKey);
          break;
        case 'anthropic':
          testResult = await testAnthropic(body.modelEndpoint, body.modelName, apiKey);
          break;
        default:
          return NextResponse.json(
            { error: "Unsupported provider" },
            { status: 400 }
          );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      testResult = {
        success: false,
        message: `Connection failed: ${errorMessage}`,
      };
    }

    testResult.latencyMs = Date.now() - startTime;

    return NextResponse.json({
      success: testResult.success,
      data: testResult,
    });
  } catch (error) {
    console.error("Error testing AI connection:", error);
    return NextResponse.json(
      { error: "Failed to test connection" },
      { status: 500 }
    );
  }
}

/**
 * Test Azure AI Foundry connection
 */
async function testAzureFoundry(
  endpoint: string, 
  modelName: string, 
  apiKey: string
): Promise<{ success: boolean; message: string; modelInfo?: any }> {
  // Ensure endpoint ends properly
  const baseUrl = endpoint.replace(/\/$/, '');
  
  // Azure OpenAI uses the chat completions endpoint
  const url = `${baseUrl}/openai/deployments/${modelName}/chat/completions?api-version=2024-02-15-preview`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      messages: [
        { role: 'user', content: 'Say "Connection successful" in exactly 2 words.' }
      ],
      max_tokens: 10,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message || errorJson.message || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    return {
      success: false,
      message: `Azure AI Foundry error: ${errorMessage}`,
    };
  }

  const data = await response.json();
  
  return {
    success: true,
    message: 'Successfully connected to Azure AI Foundry',
    modelInfo: {
      model: data.model,
      usage: data.usage,
    },
  };
}

/**
 * Test OpenAI API connection
 */
async function testOpenAI(
  endpoint: string, 
  modelName: string, 
  apiKey: string
): Promise<{ success: boolean; message: string; modelInfo?: any }> {
  const baseUrl = endpoint || 'https://api.openai.com/v1';
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'user', content: 'Say "Connection successful" in exactly 2 words.' }
      ],
      max_tokens: 10,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    return {
      success: false,
      message: `OpenAI error: ${errorMessage}`,
    };
  }

  const data = await response.json();
  
  return {
    success: true,
    message: 'Successfully connected to OpenAI',
    modelInfo: {
      model: data.model,
      usage: data.usage,
    },
  };
}

/**
 * Test Anthropic API connection
 */
async function testAnthropic(
  endpoint: string, 
  modelName: string, 
  apiKey: string
): Promise<{ success: boolean; message: string; modelInfo?: any }> {
  const baseUrl = endpoint || 'https://api.anthropic.com/v1';
  const url = `${baseUrl.replace(/\/$/, '')}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'user', content: 'Say "Connection successful" in exactly 2 words.' }
      ],
      max_tokens: 10,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    return {
      success: false,
      message: `Anthropic error: ${errorMessage}`,
    };
  }

  const data = await response.json();
  
  return {
    success: true,
    message: 'Successfully connected to Anthropic',
    modelInfo: {
      model: data.model,
      usage: data.usage,
    },
  };
}
