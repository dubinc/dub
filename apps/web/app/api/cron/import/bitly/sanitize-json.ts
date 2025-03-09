export const sanitizeBitlyJson = (json: string): string => {
  try {
    // Apply the regex first to simplify the structure
    const simplifiedJson = json.replace(
      /"long_url":"([^"]+)".+?"archived"/g,
      '"long_url":"$1","archived"',
    );

    // Then handle control characters
    return simplifiedJson.replace(/[\u0000-\u001F\u007F-\u009F]/g, (char) => {
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
  } catch (error) {
    console.error("Error in sanitizing JSON:", error);
    // Return the original JSON if sanitization fails
    return json;
  }
};
