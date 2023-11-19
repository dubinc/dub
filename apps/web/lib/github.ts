export default async function getRepos(url: string[]) {
  if (!url) return [];
  return await Promise.all(
    url.map(async (url) => {
      const {
        description,
        stargazers_count: stars,
        forks,
      } = (await fetch(
        `https://api.github.com/repos/${url.replace(
          "https://github.com/",
          "",
        )}`,
        {
          ...(process.env.GITHUB_OAUTH_TOKEN && {
            headers: {
              Authorization: `Bearer ${process.env.GITHUB_OAUTH_TOKEN}`,
              "Content-Type": "application/json",
            },
          }),
        },
      ).then((res) => res.json())) || {};

      return {
        url,
        description,
        stars,
        forks,
      };
    }),
  );
}
