export default async function SuccessPage({
  params,
}: {
  params: Promise<{ workspace: string; plan?: string; period?: string }>;
}) {
  const { workspace: workspaceSlug, plan, period } = await params;

  return <div>Success</div>;
}
