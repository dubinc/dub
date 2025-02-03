import AddEditIntegrationForm from "@/ui/oauth-apps/add-edit-integration-form";
import { BackLink } from "@/ui/shared/back-link";
import { prisma } from "@dub/prisma";
import { MaxWidthWrapper } from "@dub/ui";
import { notFound } from "next/navigation";

export default async function IntegrationManagePage({
  params,
}: {
  params: { slug: string; integrationSlug: string };
}) {
  // this is only available for Dub workspace for now
  // we might open this up to other workspaces in the future
  if (params.slug !== "dub") {
    notFound();
  }
  const integration = await prisma.integration.findUnique({
    where: {
      slug: params.integrationSlug,
    },
  });
  if (!integration) {
    notFound();
  }
  return (
    <MaxWidthWrapper className="grid max-w-screen-lg gap-8">
      <BackLink href={`/${params.slug}/settings/integrations`}>
        Back to integrations
      </BackLink>

      <AddEditIntegrationForm
        integration={{
          ...integration,
          screenshots: integration.screenshots as string[],
        }}
      />
    </MaxWidthWrapper>
  );
}
