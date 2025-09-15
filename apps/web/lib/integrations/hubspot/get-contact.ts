import { HUBSPOT_API_HOST } from "./constants";
import { hubSpotContactSchema } from "./schema";

export async function getContact({
  contactId,
  accessToken,
}: {
  contactId: number;
  accessToken: string;
}) {
  try {
    const response = await fetch(
      `${HUBSPOT_API_HOST}/crm/v3/objects/contacts/${contactId}?properties=email,firstname,lastname,phone,dub_id`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message);
    }

    return hubSpotContactSchema.parse(result);
  } catch (error) {
    console.error(
      `Failed to retrieve contact ${contactId} from HubSpot: ${error}`,
    );
    return null;
  }
}
