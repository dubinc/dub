export const runtime = "edge";

export default function DeepLinkPage({ params }: { params: { url: string } }) {
  const url = decodeURIComponent(params.url).replace(/\+/g, " ");

  return <meta httpEquiv="refresh" content={`0; url=${url}`} />;
}
