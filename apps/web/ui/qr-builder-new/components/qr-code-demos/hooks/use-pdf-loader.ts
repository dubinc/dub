import { useEffect, useState } from "react";

interface UsePdfLoaderProps {
  file?: File;
  url?: string;
}

interface PdfLoadResult {
  imageDataUrl: string | null;
  loadingTask: any | null;
  isLoading: boolean;
  error: string | null;
}

export function usePdfLoader({ file, url }: UsePdfLoaderProps): PdfLoadResult {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [loadingTask, setLoadingTask] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file && !url) {
      setImageDataUrl(null);
      setLoadingTask(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const loadPdf = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { pdfjs } = await import("react-pdf");

        if (typeof window !== "undefined") {
          pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
        }

        let task;

        if (url) {
          task = pdfjs.getDocument(url);
        } else if (file) {
          const reader = new FileReader();

          reader.onload = async () => {
            const typedArray = new Uint8Array(reader.result as ArrayBuffer);
            const fileTask = pdfjs.getDocument({ data: typedArray });
            setLoadingTask(fileTask);
            await renderPdf(fileTask);
          };

          reader.readAsArrayBuffer(file);
          return;
        }

        if (task) {
          setLoadingTask(task);
          await renderPdf(task);
        }
      } catch (err) {
        console.error("PDF load error:", err);
        setError(err instanceof Error ? err.message : "Failed to load PDF");
        setImageDataUrl(null);
        setLoadingTask(null);
      } finally {
        setIsLoading(false);
      }
    };

    const renderPdf = async (task: any) => {
      try {
        const pdf = await task.promise;
        const page = await pdf.getPage(1);

        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;

        const dataUrl = canvas.toDataURL();
        setImageDataUrl(dataUrl);
      } catch (err) {
        console.error("PDF render error:", err);
        setError(err instanceof Error ? err.message : "Failed to render PDF");
        setImageDataUrl(null);
      }
    };

    loadPdf();
  }, [file, url]);

  return { imageDataUrl, loadingTask, isLoading, error };
}
