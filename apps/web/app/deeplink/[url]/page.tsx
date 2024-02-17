import DeeplinkClient from "./client";

export const runtime = "edge";

export default async function Deeplink({
  params,
}: {
  params: { url: string };
}) {
  const url = decodeURIComponent(params.url);

  return <DeeplinkClient url={url} />;
}
