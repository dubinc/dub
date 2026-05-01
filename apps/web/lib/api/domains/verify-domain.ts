export const verifyDomain = async (domain: string) => {
  return await fetch(
    `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${domain.toLowerCase()}/verify?teamId=${process.env.TEAM_ID_VERCEL}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_API_KEY}`,
        "Content-Type": "application/json",
      },
    },
  ).then((res) => res.json());
};
