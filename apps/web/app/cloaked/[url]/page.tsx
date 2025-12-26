import {
  GOOGLE_FAVICON_URL,
  constructMetadata,
  getApexDomain,
} from "@dub/utils";
import { getMetaTags } from "app/api/links/metatags/utils";
import { PDFDocument } from "./pdf-document";

export const runtime = "edge";
export const fetchCache = "force-no-store";

export async function generateMetadata(props: {
  params: Promise<{ url: string }>;
}) {
  const params = await props.params;
  const url = decodeURIComponent(params.url); // key can potentially be encoded

  const metatags = await getMetaTags(url);

  const apexDomain = getApexDomain(url);

  return constructMetadata({
    fullTitle: metatags.title,
    description: metatags.description,
    image: metatags.image,
    icons: `${GOOGLE_FAVICON_URL}${apexDomain}`,
    noIndex: true,
  });
}

export default async function CloakedPage(props: {
  params: Promise<{ url: string }>;
}) {
  const params = await props.params;
  const url = decodeURIComponent(params.url);

  if (url.endsWith(".pdf")) {
    // Fetch PDF on server side
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();

    // Convert ArrayBuffer to base64 (edge runtime compatible)
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const dataUrl = `data:application/pdf;base64,${base64}`;

    return <PDFDocument dataUrl={dataUrl} />;
  }

  return <iframe src={url} className="min-h-screen w-full border-none" />;
}
