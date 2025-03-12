/**
 * Utilities for fetching links from Bitly API
 */

import { sanitizeBitlyJson } from "./sanitize-json";

interface FetchBitlyLinksResult {
  links: any[];
  nextSearchAfter: string | null;
  rateLimited: boolean;
  batchStats?: {
    batchCount: number;
    totalLinks: number;
  };
}

/**
 * Fetch links from Bitly with batch support for high rate limit groups
 */
export const fetchBitlyLinks = async ({
  bitlyGroup,
  bitlyApiKey,
  searchAfter = null,
  createdBefore = null,
}: {
  bitlyGroup: string;
  bitlyApiKey: string;
  searchAfter: string | null;
  createdBefore: string | null;
}): Promise<FetchBitlyLinksResult> => {
  // Use batch fetching for high rate limit group
  if (bitlyGroup === "Backg8weUUQ") {
    console.log("Using batch fetching for high rate limit group");
    return fetchBitlyLinksBatch({
      bitlyGroup,
      bitlyApiKey,
      searchAfter,
      createdBefore,
    });
  }

  // Use standard fetching for regular groups
  return fetchBitlyLinksStandard({
    bitlyGroup,
    bitlyApiKey,
    searchAfter,
    createdBefore,
  });
};

/**
 * Standard method to fetch links from Bitly (single request)
 */
const fetchBitlyLinksStandard = async ({
  bitlyGroup,
  bitlyApiKey,
  searchAfter,
  createdBefore,
}: {
  bitlyGroup: string;
  bitlyApiKey: string;
  searchAfter: string | null;
  createdBefore: string | null;
}): Promise<FetchBitlyLinksResult> => {
  const response = await fetch(
    `https://api-ssl.bitly.com/v4/groups/${bitlyGroup}/bitlinks?${new URLSearchParams(
      {
        size: "100",
        ...(searchAfter && { search_after: searchAfter }),
        ...(createdBefore && { created_before: createdBefore }),
      },
    )}`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bitlyApiKey}`,
      },
    },
  );

  if (!response.ok && response.status === 429) {
    return {
      links: [],
      nextSearchAfter: searchAfter,
      rateLimited: true,
    };
  }

  // Get response as text first
  const responseText = await response.text();
  const sanitizedResponseText = sanitizeBitlyJson(responseText);
  let data;
  try {
    // Sanitize the JSON and then parse it
    data = JSON.parse(sanitizedResponseText);
  } catch (error) {
    console.error("JSON parsing error:", error);
    console.error(`Failed to parse response: ${sanitizedResponseText}`);
    throw new Error("Failed to parse JSON response from Bitly API");
  }

  if (!data.links || !data.pagination) {
    console.log("Unexpected response format:", data);
    return {
      links: [],
      nextSearchAfter: null,
      rateLimited: false,
    };
  }

  const { links, pagination } = data;
  const nextSearchAfter = pagination.search_after;

  return {
    links,
    nextSearchAfter,
    rateLimited: false,
  };
};

/**
 * Batch method to fetch links from Bitly (multiple requests)
 * For use with high rate limit groups
 */
const fetchBitlyLinksBatch = async ({
  bitlyGroup,
  bitlyApiKey,
  searchAfter,
  createdBefore,
}: {
  bitlyGroup: string;
  bitlyApiKey: string;
  searchAfter: string | null;
  createdBefore: string | null;
}): Promise<FetchBitlyLinksResult> => {
  // Array to collect all links from multiple requests
  let allLinks: any[] = [];
  let currentSearchAfter = searchAfter;
  let nextSearchAfter = null;
  const maxRequests = 10; // Number of consecutive requests to make

  // Make multiple requests to fetch up to 1000 links
  for (let i = 0; i < maxRequests; i++) {
    const response = await fetch(
      `https://api-ssl.bitly.com/v4/groups/${bitlyGroup}/bitlinks?${new URLSearchParams(
        {
          size: "100",
          ...(currentSearchAfter && { search_after: currentSearchAfter }),
          ...(createdBefore && { created_before: createdBefore }),
        },
      )}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${bitlyApiKey}`,
        },
      },
    );

    // Check for rate limiting
    if (!response.ok && response.status === 429) {
      // If rate limited on the first request, return with rateLimited flag
      if (i === 0) {
        return {
          links: [],
          nextSearchAfter: searchAfter,
          rateLimited: true,
        };
      } else {
        // If rate limited after collecting some links, process what we have so far
        console.log(
          `Rate limited after ${i} requests. Processing ${allLinks.length} links.`,
        );
        break;
      }
    }

    // Get response as text first
    const responseText = await response.text();
    const sanitizedResponseText = sanitizeBitlyJson(responseText);
    let data;
    try {
      // Sanitize the JSON and then parse it
      data = JSON.parse(sanitizedResponseText);
    } catch (error) {
      console.error("JSON parsing error:", error);
      console.error(`Failed to parse response: ${sanitizedResponseText}`);

      if (i === 0) {
        throw new Error("Failed to parse JSON response from Bitly API");
      }
      break; // Process what we have so far
    }

    // If the response is not as expected, break the loop
    if (!data.links || !data.pagination) {
      console.log("Unexpected response format:", data);
      if (i === 0) {
        return {
          links: [],
          nextSearchAfter: null,
          rateLimited: false,
        };
      }
      break; // Process what we have so far
    }

    const { links, pagination } = data;
    nextSearchAfter = pagination.search_after;

    // Add links to our collection
    allLinks = [...allLinks, ...links];

    // Update search_after for next request
    currentSearchAfter = nextSearchAfter;

    // If there are no more links to fetch, break the loop
    if (!nextSearchAfter || links.length < 100) {
      break;
    }
  }

  console.log(
    `Batch fetched ${allLinks.length} links in ${Math.ceil(allLinks.length / 100)} requests`,
  );

  return {
    links: allLinks,
    nextSearchAfter,
    rateLimited: false,
    batchStats: {
      batchCount: Math.ceil(allLinks.length / 100),
      totalLinks: allLinks.length,
    },
  };
};
