export const getPangeaDomainIntel = async (domain: string) => {
  return fetch("https://domain-intel.aws.us.pangea.cloud/v2/reputation", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.PANGEA_API_KEY}`,
    },
    body: JSON.stringify({
      domains: [domain],
    }),
  }).then((res) => res.json());
};
