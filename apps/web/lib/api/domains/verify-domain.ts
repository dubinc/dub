export const verifyDomain = async (domain: string) => {
  const res = await fetch(
    `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${domain.toLowerCase()}/verify?teamId=${process.env.TEAM_ID_VERCEL}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_API_KEY}`,
        "Content-Type": "application/json",
      },
    },
  );
  return res.json();
};

export const verifyDomainWithRetry = async (
  domain: string,
  {
    attempts = 3,
    delayMs = 2500,
  }: { attempts?: number; delayMs?: number } = {},
) => {
  let last: any = null;
  for (let i = 0; i < attempts; i++) {
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    last = await verifyDomain(domain);
    if (last?.verified) {
      return last;
    }
  }
  return last;
};
