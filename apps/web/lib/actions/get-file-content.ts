"use server";

import { storage } from "@/lib/storage";

type FileContentResult =
  | {
      success: true;
      data: string;
    }
  | {
      success: false;
      error: string;
    };

export async function getFileContent(
  fileId: string,
): Promise<FileContentResult> {
  try {
    const response = await storage.fetch(`qrs-content/${fileId}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    return {
      success: true,
      data: base64,
    };
  } catch (error) {
    console.error("Error fetching file content:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
