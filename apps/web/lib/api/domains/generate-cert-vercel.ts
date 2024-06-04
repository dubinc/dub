import { getDomainWithoutWWW } from "@dub/utils";
import { DubApiError } from "../errors";

export const generateCert = async (domain: string) => {
  const response = await fetch(
    `https://api.vercel.com/v7/certs?slug=${domain}&teamId=${process.env.TEAM_ID_VERCEL}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cns: [getDomainWithoutWWW(domain)],
      }),
    },
  );

  const data = await response.json();

  console.log(data);

  if (!response.ok) {
    throw new DubApiError({
      code: "bad_request",
      message: data.error.message,
    });
  }

  return await response.json();
};
