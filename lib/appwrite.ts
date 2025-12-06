import { Client, Storage, ID, type UploadProgress, ImageGravity } from "appwrite";

// Initialize Appwrite client
const client = new Client();

// Use environment variables (client-side needs NEXT_PUBLIC_ prefix)
const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://syd.cloud.appwrite.io/v1";
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "prismo";

client.setEndpoint(endpoint).setProject(projectId);

// Initialize Storage service
export const storage = new Storage(client);

// Bucket ID for receipts/documents
export const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID || process.env.APPWRITE_BUCKET_ID || "prismo-bucket";

// File upload types
export type UploadResult = {
  fileId: string;
  fileUrl: string;
  thumbnailUrl?: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  bucketId: string;
};

// Upload a file to Appwrite storage
export async function uploadFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  try {
    const fileId = ID.unique();
    
    // Upload file
    const response = await storage.createFile(
      BUCKET_ID,
      fileId,
      file,
      undefined, // permissions - use bucket defaults
      (progress: UploadProgress) => {
        if (onProgress) {
          onProgress(progress.progress);
        }
      }
    );

    // Generate file URL
    const fileUrl = storage.getFileView(BUCKET_ID, fileId).toString();
    
    // Generate thumbnail URL for images
    let thumbnailUrl: string | undefined;
    if (file.type.startsWith("image/")) {
      thumbnailUrl = storage.getFilePreview(
        BUCKET_ID,
        fileId,
        200, // width
        200, // height
        ImageGravity.Center, // gravity
        100 // quality
      ).toString();
    }

    return {
      fileId: response.$id,
      fileUrl,
      thumbnailUrl,
      fileName: response.name,
      fileSize: response.sizeOriginal,
      fileType: response.mimeType,
      bucketId: BUCKET_ID,
    };
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
}

// Upload from base64 (for camera captures)
export async function uploadBase64File(
  base64Data: string,
  fileName: string,
  mimeType: string
): Promise<UploadResult> {
  try {
    // Convert base64 to blob
    const byteCharacters = atob(base64Data.split(",")[1] || base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    
    // Create File from Blob
    const file = new File([blob], fileName, { type: mimeType });
    
    return uploadFile(file);
  } catch (error) {
    console.error("Error uploading base64 file:", error);
    throw error;
  }
}

// Delete a file from Appwrite storage
export async function deleteFile(fileId: string): Promise<void> {
  try {
    await storage.deleteFile(BUCKET_ID, fileId);
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
}

// Get file URL
export function getFileUrl(fileId: string): string {
  return storage.getFileView(BUCKET_ID, fileId).toString();
}

// Get file preview URL (for images)
export function getFilePreviewUrl(
  fileId: string,
  width = 400,
  height = 400
): string {
  return storage.getFilePreview(
    BUCKET_ID,
    fileId,
    width,
    height,
    ImageGravity.Center,
    100
  ).toString();
}

// Get file download URL
export function getFileDownloadUrl(fileId: string): string {
  return storage.getFileDownload(BUCKET_ID, fileId).toString();
}

// Supported file types for receipts
export const SUPPORTED_RECEIPT_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
];

// Max file size (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Validate file before upload
export function validateReceiptFile(file: File): { valid: boolean; error?: string } {
  if (!SUPPORTED_RECEIPT_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file type. Supported types: ${SUPPORTED_RECEIPT_TYPES.map(t => t.split("/")[1]).join(", ")}`,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  return { valid: true };
}

export { client, ID };
