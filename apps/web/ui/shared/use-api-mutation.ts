import useWorkspace from "@/lib/swr/use-workspace";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface ApiRequestOptions<TBody> {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: TBody;
  headers?: Record<string, string>;
  showToast?: boolean;
  successMessage?: string;
  onSuccess?: () => void;
  onError?: () => void;
}

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  makeRequest: (
    endpoint: string,
    options?: ApiRequestOptions<any>,
  ) => Promise<void>;
}

interface ApiError {
  error: {
    message: string;
  };
}

const debug = (...args: any[]) => {
  if (process.env.NODE_ENV === "development") {
    console.log(...args);
  }
};

export function useApiRequest<
  TResponse = any,
  TBody = any,
>(): ApiResponse<TResponse> {
  const { id: workspaceId } = useWorkspace();
  const [data, setData] = useState<TResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const makeRequest = useCallback(
    async (endpoint: string, options: ApiRequestOptions<TBody> = {}) => {
      const {
        method = "GET",
        body,
        headers,
        successMessage,
        showToast = true,
        onSuccess,
        onError,
      } = options;

      setLoading(true);
      setError(null);
      setData(null);

      try {
        debug("Starting request", {
          endpoint,
          method,
          body,
          headers,
        });

        const response = await fetch(`${endpoint}?workspaceId=${workspaceId}`, {
          method,
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        // Handle error
        if (!response.ok) {
          const { error } = (await response.json()) as ApiError;
          throw new Error(
            error.message || `Request failed with status ${response.status}`,
          );
        }

        // Handle success
        const data = (await response.json()) as TResponse;
        setData(data);
        onSuccess?.();

        if (showToast) {
          toast.success(successMessage || "Request completed successfully.");
        }

        debug("Response received", data);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
        );

        onError?.();

        if (showToast) {
          toast.error(error.message);
        }

        debug("Error occurred", error);
      } finally {
        setLoading(false);
        debug("Request finished");
      }
    },
    [],
  );

  return {
    data,
    error,
    loading,
    makeRequest,
  };
}
