export const editQueryString = (
  queryString: string,
  data: Record<string, string>,
  del?: string | string[],
) => {
  const searchParams = new URLSearchParams(queryString);

  for (const key in data) {
    searchParams.set(key, data[key]);
  }

  if (del)
    (Array.isArray(del) ? del : [del]).forEach((d) => searchParams.delete(d));

  return searchParams.toString();
};
