export function getStatusCodeBadgeVariant(statusCode: number) {
  if (statusCode >= 200 && statusCode < 300) return "success";
  if (statusCode >= 400 && statusCode < 500) return "error";
  return "error";
}
