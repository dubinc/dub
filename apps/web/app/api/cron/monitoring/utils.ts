export async function checkLink(url: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // timeout if it takes longer than 5 seconds
  return await fetch(url, {
    signal: controller.signal,
    headers: {
      "User-Agent": "dub-bot/1.0",
    },
  })
    .then(async (response) => {
      clearTimeout(timeoutId);
      return {
        status: response.status,
        error: response.status !== 200 ? await response.text() : undefined,
      };
    })
    .catch((error) => {
      console.log(url, error);
      return {
        status: 500,
        error: error.message,
      };
    });
}

export async function recordCheck(
  data: {
    projectId: string;
    domain: string;
    key: string;
    url: string;
    status: number;
    error?: string;
  }[],
) {
  return await fetch(
    "https://api.us-east.tinybird.co/v0/events?name=monitoring_events&wait=true",
    {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
      },
    },
  ).then((res) => res.json());
}
