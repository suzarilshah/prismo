import { NextRequest, NextResponse } from "next/server";
import { Client, Storage, ID } from "node-appwrite";
import { getSession } from "@/lib/auth";

// Initialize Appwrite client for server-side
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || "https://syd.cloud.appwrite.io/v1")
  .setProject(process.env.APPWRITE_PROJECT_ID || "prismo")
  .setKey(process.env.APPWRITE_API_KEY || "");

const storage = new Storage(client);
const BUCKET_ID = process.env.APPWRITE_BUCKET_ID || "prismo-bucket";

// Supported file types
const SUPPORTED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// POST /api/upload - Upload a file to Appwrite storage
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const purpose = formData.get("purpose") as string || "receipt"; // 'receipt', 'document', 'payslip'

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!SUPPORTED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type. Supported: ${SUPPORTED_TYPES.map(t => t.split("/")[1]).join(", ")}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Generate unique file ID
    const fileId = ID.unique();
    
    // Create a proper filename with timestamp
    const timestamp = Date.now();
    const extension = file.name.split(".").pop() || "jpg";
    const fileName = `${purpose}_${session.user.id}_${timestamp}.${extension}`;

    // Convert File to Buffer for node-appwrite
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Appwrite using InputFile
    const { InputFile } = await import("node-appwrite/file");
    const inputFile = InputFile.fromBuffer(buffer, fileName);

    const response = await storage.createFile(
      BUCKET_ID,
      fileId,
      inputFile
    );

    // Generate URLs
    const fileUrl = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${response.$id}/view?project=${process.env.APPWRITE_PROJECT_ID}`;
    const downloadUrl = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${response.$id}/download?project=${process.env.APPWRITE_PROJECT_ID}`;
    
    // Generate thumbnail URL for images
    let thumbnailUrl: string | null = null;
    if (file.type.startsWith("image/")) {
      thumbnailUrl = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${response.$id}/preview?project=${process.env.APPWRITE_PROJECT_ID}&width=200&height=200`;
    }

    return NextResponse.json({
      success: true,
      data: {
        fileId: response.$id,
        fileName: response.name,
        fileSize: response.sizeOriginal,
        fileType: response.mimeType,
        fileUrl,
        downloadUrl,
        thumbnailUrl,
        bucketId: BUCKET_ID,
        uploadedAt: response.$createdAt,
      },
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

// DELETE /api/upload - Delete a file from Appwrite storage
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json({ error: "File ID required" }, { status: 400 });
    }

    await storage.deleteFile(BUCKET_ID, fileId);

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
