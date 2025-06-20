"use server";

import { storage } from "@/lib/storage";

type FileContentResult = {
  success: true;
  data: {
    content: string;
    contentType: string;
    size: number;
    previewUrl?: string;
  };
} | {
  success: false;
  error: string;
};

export async function getFileContent(fileId: string): Promise<FileContentResult> {
  try {
    // Use the storage client to fetch the file directly from R2
    const response = await storage.fetch(`qrs-content/${fileId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    // Get the file content as a blob
    const blob = await response.blob();
    
    // For images, create an object URL for immediate preview
    let previewUrl;
    if (blob.type.startsWith('image/')) {
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      previewUrl = `data:${blob.type};base64,${base64}`;
    }
    
    // Convert to base64 for storage
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    
    return {
      success: true,
      data: {
        content: base64,
        contentType: blob.type,
        size: blob.size,
        previewUrl,
      }
    };
  } catch (error) {
    console.error("Error fetching file content:", error);
    return {
      success: false,
      error: error.message
    };
  }
} 