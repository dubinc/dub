import { CustomResponse } from "./utils";

export const configureVercelNameservers = async (
  domain: string,
): Promise<CustomResponse> => {
  return await fetch(
    `https://api.vercel.com/v3/domains/${domain}?teamId=${process.env.TEAM_ID_VERCEL}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        op: "update",
        zone: true,
      }),
    },
  ).then((res) => res.json());
};
