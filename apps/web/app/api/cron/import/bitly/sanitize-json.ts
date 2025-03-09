export const sanitizeJson = (json: string): string => {
  // Replace control characters that are not allowed in JSON string literals
  return json.replace(/[\u0000-\u001F\u007F-\u009F]/g, (char) => {
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
};
