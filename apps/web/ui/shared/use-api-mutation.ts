import useWorkspace from "@/lib/swr/use-workspace";
import { useCallback, useState } from "react";

interface ApiRequestOptions<TBody, TResponse = any> {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: TBody;
  headers?: Record<string, string>;
  onSuccess?: (data: TResponse) => void;
  onError?: (message: string) => void;
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

export function useApiMutation<TResponse = any, TBody = any>() {
  const { id: workspaceId } = useWorkspace();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const makeRequest = useCallback(
    async (
      endpoint: string,
      {
        method = "GET",
        body,
        headers,
        onSuccess,
        onError,
      }: ApiRequestOptions<TBody, TResponse> = {},
    ) => {
      setIsSubmitting(true);

      try {
        const url = new URL(endpoint, window.location.origin);

        if (workspaceId) {
          url.searchParams.set("workspaceId", workspaceId);
        }

        if (body) {
          debug("Request body", body);
        }

        const response = await fetch(url.toString(), {
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
            error?.message || `Request failed with status ${response.status}`,
          );
        }

        const responseData = (await response.json()) as TResponse;

        debug("Response data", responseData);

        onSuccess?.(responseData);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.";

        debug("Request error", err);

        onError?.(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [workspaceId],
  );

  return {
    isSubmitting,
    makeRequest,
  };
}
