import { useCallback, useRef, useState } from "react";

interface UploadProgress {
  file: File;
  progress: number;
  status: "uploading" | "processing" | "success" | "error";
  error?: string;
  fileId?: string;
}

interface UseFileUploadOptions {
  onFileIdReceived?: (fileId: string) => void;
  onProgress?: (file: File, progress: number) => void;
  onSuccess?: (file: File, fileId: string) => void;
  onError?: (file: File, error: string) => void;
}

const uploadUrl = process.env.NEXT_PUBLIC_FILES_HANDLER_URL;

export const useFileUpload = (options: UseFileUploadOptions = {}) => {
  const [uploadProgress, setUploadProgress] = useState<
    Map<File, UploadProgress>
  >(new Map());
  const [isUploading, setIsUploading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      // Cancel any existing upload
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setIsUploading(true);

      // Initialize progress tracking
      setUploadProgress(
        (prev) =>
          new Map(
            prev.set(file, {
              file,
              progress: 0,
              status: "uploading",
            }),
          ),
      );

      try {
        const result = await uploadFileWithProgress(
          file,
          (uploadFile, progress) => {
            setUploadProgress(
              (prev) =>
                new Map(
                  prev.set(file, {
                    file,
                    progress,
                    status: progress === 100 ? "processing" : "uploading",
                  }),
                ),
            );

            options.onProgress?.(uploadFile, progress);

            if (progress === 100) {
              setIsUploading(false);
            }
          },
          abortControllerRef.current.signal,
        );

        if (result?.file?.id) {
          const fileId = result.file.id;

          setUploadProgress(
            (prev) =>
              new Map(
                prev.set(file, {
                  file,
                  progress: 100,
                  status: "success",
                  fileId,
                }),
              ),
          );

          options.onFileIdReceived?.(fileId);
          options.onSuccess?.(file, fileId);

          return fileId;
        } else {
          throw new Error("No file ID received");
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return null;
        }

        const errorMessage =
          error instanceof Error ? error.message : "Upload failed";

        setUploadProgress(
          (prev) =>
            new Map(
              prev.set(file, {
                file,
                progress: 0,
                status: "error",
                error: errorMessage,
              }),
            ),
        );

        options.onError?.(file, errorMessage);
        throw error;
      } finally {
        setIsUploading(false);
        abortControllerRef.current = null;
      }
    },
    [options],
  );

  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsUploading(false);
    setUploadProgress(new Map());
  }, []);

  const getFileProgress = useCallback(
    (file: File) => {
      return uploadProgress.get(file);
    },
    [uploadProgress],
  );

  const clearProgress = useCallback(() => {
    setUploadProgress(new Map());
  }, []);

  return {
    uploadFile,
    cancelUpload,
    getFileProgress,
    clearProgress,
    isUploading,
    uploadProgress: Array.from(uploadProgress.values()),
  };
};

// Helper function for upload (same as old builder)
const uploadFileWithProgress = (
  file: File,
  onProgress: (file: File, progress: number) => void,
  signal?: AbortSignal,
) => {
  return new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    const formData = new FormData();
    formData.append("file", file);

    if (signal) {
      signal.addEventListener("abort", () => {
        xhr.abort();
      });
    }

    xhr.upload.addEventListener(
      "progress",
      (event: ProgressEvent<XMLHttpRequestEventTarget>) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(file, progress);
        }
      },
    );

    xhr.addEventListener("load", () => {
      if (xhr.status === 200) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (error) {
          reject(new Error("Invalid JSON response"));
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Upload failed"));
    });

    xhr.addEventListener("timeout", () => {
      reject(new Error("Upload timeout"));
    });

    if (!uploadUrl) {
      reject(
        new Error(
          "Upload URL not configured. Please set NEXT_PUBLIC_FILES_HANDLER_URL environment variable.",
        ),
      );
      return;
    }

    xhr.open("POST", uploadUrl);

    xhr.send(formData);
  });
};
