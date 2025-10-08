interface SWRError extends Error {
  info: any;
  status: number;
}

export async function textFetcher(
  input: RequestInfo,
  init?: RequestInit & { headers?: Record<string, string> },
): Promise<string> {
  const res = await fetch(input, {
    ...init,
    ...(init?.headers && { headers: init.headers }),
  });

  if (!res.ok) {
    let message = "An error occurred while fetching the data.";
    try {
      message = (await res.json())?.error?.message;
    } catch (e) {}
    const error = new Error(message) as SWRError;
    error.info = message;
    error.status = res.status;

    throw error;
  }

  return res.text();
}
