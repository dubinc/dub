import { get } from "@vercel/edge-config";

export const updateConfig = async ({
  key,
  value,
}: {
  key:
    | "domains"
    | "whitelistedDomains"
    | "terms"
    | "referrers"
    | "keys"
    | "whitelist"
    | "emails"
    | "reserved"
    | "reservedUsernames"
    | "partnersPortal";
  value: string;
}) => {
  const existingData = (await get(key)) as string[];
  const newData = Array.from(new Set([...existingData, value]));

  return await fetch(
    `https://api.vercel.com/v1/edge-config/${process.env.EDGE_CONFIG_ID}/items?teamId=${process.env.TEAM_ID_VERCEL}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            operation: "update",
            key: key,
            value: newData,
          },
        ],
      }),
    },
  );
};
