import { HUBSPOT_API_HOST } from "./constants";
import { hubSpotDealSchema } from "./schema";

export async function getHubSpotDeal({
  dealId,
  accessToken,
}: {
  dealId: number;
  accessToken: string;
}) {
  try {
    const response = await fetch(
      `${HUBSPOT_API_HOST}/crm/v3/objects/0-3/${dealId}?associations=contacts`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const result = await response.json();

    if (process.env.NODE_ENV === "development") {
      console.log("HubSpot deal", result);
    }

    if (!response.ok) {
      throw new Error(result.message);
    }

    return hubSpotDealSchema.parse(result);
  } catch (error) {
    console.error(`[HubSpot] Failed to retrieve deal ${dealId}: ${error}`);
    return null;
  }
}
