// Cache the public marketplace endpoints at the edge so repeated queries (each
// filter combination keys on its URL) are absorbed by the CDN instead of hitting
// the DB. Short browser TTL, longer edge TTL — same pattern as `/api/links/metatags`.
export const PUBLIC_MARKETPLACE_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=300",
  "Vercel-CDN-Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
};
