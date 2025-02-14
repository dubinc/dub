export function hasEmptySearchParams(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    for (const [_key, value] of parsedUrl.searchParams.entries()) {
      if (value === "") {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}
