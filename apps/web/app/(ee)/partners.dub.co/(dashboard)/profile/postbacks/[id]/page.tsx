import { PostbackDetailPageClient } from "./page-client";

export default async function PostbackDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  return <PostbackDetailPageClient postbackId={id} />;
}
