export const runtime = "edge";

export default function DeepLinkPage({ params }: { params: { url: string } }) {
  // First decode the full URL parameter from the route
  const url = decodeURIComponent(params.url);
  // Split into base URL and query string
  const [front, query] = url.split("?");

  let redirectUrl = url;

  // if there are query parameters, we need to process them
  if (query) {
    // Parse the query string (but don't use toString() later as it adds extra encoding)
    const queryParams = new URLSearchParams(query);

    // Process each parameter with proper encoding
    const processedParams = Array.from(queryParams.entries()).map(
      ([key, value]) => {
        // Handle form-encoded spaces ('+' → ' ')
        const decodedFromForm = value.replace(/\+/g, " ");
        // Decode any existing percent-encoding (e.g., '%26' → '&')
        const fullyDecoded = decodeURIComponent(decodedFromForm);
        // Apply one clean round of encoding
        const encoded = encodeURIComponent(fullyDecoded);

        return `${key}=${encoded}`;
      },
    );

    // Reconstruct the URL with properly encoded parameters
    redirectUrl = `${front}?${processedParams.join("&")}`;
  }

  // Redirect to the redirect URL (which may be the same as the original URL,
  // or a cleaned-up version with properly encoded parameters)
  return <meta httpEquiv="refresh" content={`0; url=${redirectUrl}`} />;
}
