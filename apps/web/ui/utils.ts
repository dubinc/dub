// Keep this until we have move all error response to new JSON format
export const extractApiErrorMessage = async (
  response: Response,
): Promise<string | null> => {
  if (response.ok) {
    return null;
  }

  // If the response is JSON, try to parse it and extract the error message
  const contentType = response.headers.get("Content-Type");
  if (contentType === "application/json") {
    const { error } = await response.json();
    return error.message;
  }

  // If parsing JSON fails, treat it as plain text error
  return await response.text();
};
