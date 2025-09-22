"use server";

import { authUserActionClient } from "./safe-action";

// Fetch primer token action - calls the checkout session API
export const fetchPrimerToken = authUserActionClient.action(async ({ ctx }) => {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/checkout/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        metadata: {},
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to fetch primer token");
    }

    return {
      clientToken: result.data.clientToken,
      clientTokenExpirationDate: result.data.clientTokenExpirationDate,
    };
  } catch (error) {
    console.error("Error fetching primer token:", error);
    throw new Error(
      error instanceof Error ? error.message : "Unknown error occurred",
    );
  }
});
