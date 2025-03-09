export function sanitizeBitlyJson(body: string): string {
  // First, remove "title" field which can sometimes contain invalid values that break the JSON parsing
  body = body.replace(
    /"long_url":"([^"]+)".+?"archived"/g,
    '"long_url":"$1","archived"',
  );

  // Then handle control characters
  return body.replace(/[\u0000-\u001F\u007F-\u009F]/g, (char) => {
    // Convert to proper JSON escape sequence if it's a common one
    switch (char) {
      case "\n":
        return "\\n";
      case "\r":
        return "\\r";
      case "\t":
        return "\\t";
      case "\b":
        return "\\b";
      case "\f":
        return "\\f";
      // Remove or replace other control characters
      default:
        return "";
    }
  });
}
