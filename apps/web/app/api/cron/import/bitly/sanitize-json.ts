export function sanitizeBitlyJson(body: string): string {
  try {
    // if body is already valid JSON, return it
    JSON.parse(body);
    return body;
  } catch (err) {
    console.error("Error parsing JSON, starting sanitization...");
  }

  // First, remove "title" field which can sometimes contain invalid values that break the JSON parsing
  body = body.replace(
    /"long_url":"([^"]+)".+?"archived"/g,
    '"long_url":"$1","archived"',
  );

  // Handle problematic characters in URLs themselves
  body = body.replace(/"long_url":"(.*?)"/g, (_match, url) => {
    // Escape backslashes and quotes that might be in the URL
    const safeUrl = url
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      // Additional problematic characters to escape
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
    return `"long_url":"${safeUrl}"`;
  });

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
