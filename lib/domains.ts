interface CustomResponse extends Response {
  json: () => Promise<any>;
  error?: { code: string; projectId: string; message: string };
}

export const addDomain = async (domain: string): Promise<CustomResponse> => {
  return await fetch(
    `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains?teamId=${process.env.VERCEL_TEAM_ID}`,
    {
      body: `{\n  "name": "${domain}"\n}`,
      headers: {
        Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    }
  ).then((res) => res.json());
};

export const removeDomain = async (domain: string) => {
  return await fetch(
    `https://api.vercel.com/v6/domains/${domain}?teamId=${process.env.VERCEL_TEAM_ID}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN}`,
      },
      method: "DELETE",
    }
  ).then((res) => res.json());
};
