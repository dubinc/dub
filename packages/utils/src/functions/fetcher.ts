interface SWRError extends Error {
  info: any;
  status: number;
}

export async function fetcher<JSON = any>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<JSON> {
  const res = await fetch(input, init);

  if (!res.ok) {
    const error = new Error(
      "An error occurred while fetching the data.",
    ) as SWRError;

    error.info = (await res.json()).error;
    error.status = res.status;

    throw error;
  }

  return res.json();
}
