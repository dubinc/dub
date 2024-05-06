// Record analytics API usage in Tinybird
export async function recordApiUsage({
  workspaceId,
}: {
  workspaceId: string;
}): Promise<Response> {
  return await fetch(
    `${process.env.TINYBIRD_API_URL}/v0/events?name=dub_api_usage&wait=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
      },
      body: JSON.stringify({
        workspaceId,
        timestamp: new Date(Date.now()).toISOString(),
      }),
    },
  );
}
