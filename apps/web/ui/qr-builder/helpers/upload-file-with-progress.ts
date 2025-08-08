export const uploadFileWithProgress = (
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

    xhr.open("POST", process.env.NEXT_PUBLIC_FILES_HANDLER_URL!);

    xhr.send(formData);
  });
};
