"use client";

import { getProgramResourceUploadUrlAction } from "@/lib/actions/partners/program-resources/get-program-resource-upload-url";
import { useAction } from "next-safe-action/hooks";

export function useUploadProgramResource(workspaceId: string) {
  const { executeAsync: getUploadUrl } = useAction(
    getProgramResourceUploadUrlAction,
  );

  const upload = async (opts: {
    file: File;
    name: string;
    resourceType: "logo" | "file";
    extension?: string;
  }) => {
    const result = await getUploadUrl({
      workspaceId,
      resourceType: opts.resourceType,
      name: opts.name,
      extension: opts.extension,
      fileSize: opts.file.size,
    });

    if (!result?.data) throw new Error("Failed to get upload URL");

    const { signedUrl, key, fileSize } = result.data;

    const headers: Record<string, string> = {};
    if (opts.resourceType === "logo" && opts.extension === "svg") {
      headers["Content-Type"] = "image/svg+xml";
    }

    const response = await fetch(signedUrl, {
      method: "PUT",
      headers,
      body: opts.file,
    });

    if (!response.ok) throw new Error(`Failed to upload ${opts.resourceType}`);

    return { key, fileSize };
  };

  return { upload };
}
