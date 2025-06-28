interface SWRError extends Error {
  info: any;
  status: number;
}

export async function fetcher<JSON = any>(
  input: RequestInfo,
  init?: RequestInit & { headers?: Record<string, string> },
): Promise<JSON> {
  const res = await fetch(input, {
    ...init,
    ...(init?.headers && { headers: init.headers }),
  });

  if (!res.ok) {
    const message =
      (await res.json())?.error?.message ||
      "An error occurred while fetching the data.";
    const error = new Error(message) as SWRError;
    error.info = message;
    error.status = res.status;

    throw error;
  }

  return res.json();
}
