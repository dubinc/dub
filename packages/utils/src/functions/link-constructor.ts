export function linkConstructor({
  domain = "dub.sh",
  key,
  localhost,
  pretty,
  noDomain,
}: {
  domain?: string;
  key?: string;
  localhost?: boolean;
  pretty?: boolean;
  noDomain?: boolean;
}) {
  const link = `${
    localhost ? "http://home.localhost:8888" : `https://${domain}`
  }${key && key !== "_root" ? `/${key}` : ""}`;

  if (noDomain) return `/${key}`;
  return pretty ? link.replace(/^https?:\/\//, "") : link;
}
