import { ClientOnly } from "@dub/ui";

export const runtime = "edge";

export default function MailtoPage({ params }: { params: { url: string } }) {
  const url = decodeURIComponent(params.url);

  return (
    <ClientOnly>
      <head>
        <meta httpEquiv="refresh" content={`0; url=${url}`} />
      </head>
    </ClientOnly>
  );
}
