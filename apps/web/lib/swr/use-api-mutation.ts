import useWorkspace from "@/lib/swr/use-workspace";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface ApiRequestOptions<TBody, TResponse> {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: TBody;
  headers?: Record<string, string>;
  onSuccess?: (data: TResponse) => void;
  onError?: (error: string) => void;
}

interface ApiResponse<T> {
  isSubmitting: boolean;
  makeRequest: (
    endpoint: string,
    options?: ApiRequestOptions<any, T>,
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

export function useApiMutation<
  TResponse = any,
  TBody = any,
>(): ApiResponse<TResponse> {
  const { id: workspaceId } = useWorkspace();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const makeRequest = useCallback(
    async (
      endpoint: string,
      options: ApiRequestOptions<TBody, TResponse> = {},
    ) => {
      const { method = "GET", body, headers, onSuccess, onError } = options;

      setIsSubmitting(true);

      try {
        debug("Starting request", {
          endpoint,
          method,
          body,
          headers,
        });

        if (!workspaceId) {
          throw new Error("Workspace ID is required.");
        }

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
        onSuccess?.(data);

        debug("Response received", data);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.";

        if (onError) {
          onError?.(errorMessage);
        } else {
          toast.error(errorMessage);
        }

        debug("Error occurred", error);
      } finally {
        setIsSubmitting(false);
        debug("Request finished");
      }
    },
    [workspaceId],
  );

  return {
    isSubmitting,
    makeRequest,
  };
}