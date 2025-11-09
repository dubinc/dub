import { constructMetadata } from "@dub/utils";
import PlaceholderContent from "./placeholder";

export const revalidate = false; // cache indefinitely

export async function generateMetadata(props: {
  params: Promise<{ domain: string }>;
}) {
  const params = await props.params;
  const title = `${params.domain.toUpperCase()} - A ${
    process.env.NEXT_PUBLIC_APP_NAME
  } Custom Domain`;
  const description = `${params.domain.toUpperCase()} is a custom domain on ${
    process.env.NEXT_PUBLIC_APP_NAME
  } - an open-source link management tool for modern marketing teams to create, share, and track short links.`;

  return constructMetadata({
    title,
    description,
  });
}

export default function CustomDomainPage() {
  return <PlaceholderContent />;
}
