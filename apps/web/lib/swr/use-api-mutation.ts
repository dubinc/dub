import { useCallback, useState } from "react";
import { toast } from "sonner";
import useWorkspace from "./use-workspace";

interface ApiRequestOptions<TBody> {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: TBody;
  headers?: Record<string, string>;
  debug?: boolean;
  showToast?: boolean;
  successMessage?: string;
  onSuccess?: () => void;
  onError?: () => void;
}

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
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

export function useApiRequest<
  TResponse = any,
  TBody = any,
>(): ApiResponse<TResponse> {
  const { id: workspaceId } = useWorkspace();
  const [data, setData] = useState<TResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const makeRequest = useCallback(
    async (endpoint: string, options: ApiRequestOptions<TBody> = {}) => {
      const {
        method = "GET",
        body,
        headers,
        successMessage,
        debug = false,
        showToast = true,
        onSuccess,
        onError,
      } = options;

      setIsLoading(true);
      setError(null);
      setData(null);

      try {
        if (debug) {
          console.log("[useApiRequest] Starting request", {
            endpoint,
            method,
            body,
            headers,
          });
        }

        const finalEndpoint = `${endpoint}?workspaceId=${workspaceId}`;

        const response = await fetch(finalEndpoint, {
          method,
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
          const { error } = (await response.json()) as ApiError;

          throw new Error(
            error.message || `Request failed with status ${response.status}`,
          );
        }

        const data = (await response.json()) as TResponse;

        setData(data);

        if (debug) {
          console.log("[useApiRequest] Response received", data);
        }

        onSuccess?.();

        if (showToast) {
          toast.success(successMessage || "Request completed successfully.");
        }
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
        );

        if (debug) {
          console.error("[useApiRequest] Error occurred", error);
        }

        onError?.();

        if (showToast) {
          toast.error(error.message);
        }
      } finally {
        setIsLoading(false);

        if (debug) {
          console.log("[useApiRequest] Request finished");
        }
      }
    },
    [],
  );

  return { data, error, isLoading, makeRequest };
}
