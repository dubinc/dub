export const normalizeDomainInput = (raw: string): string => {
  let s = raw.trim().toLowerCase();
  if (!s) {
    return s;
  }
  try {
    if (s.includes("://")) {
      const url = new URL(s);
      s = url.hostname;
    } else if (s.includes("/")) {
      const url = new URL(`https://${s}`);
      s = url.hostname;
    }
  } catch {
    // keep s as typed
  }
  if (s.startsWith("www.")) {
    s = s.slice(4);
  }
  return s;
};
