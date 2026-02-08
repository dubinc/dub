import AddEditIntegrationForm from "@/ui/oauth-apps/add-edit-integration-form";
import { BackLink } from "@/ui/shared/back-link";
import { prisma } from "@dub/prisma";
import { MaxWidthWrapper } from "@dub/ui";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function IntegrationManagePage(props: {
  params: Promise<{ slug: string; integrationSlug: string }>;
}) {
  const params = await props.params;
  // this is only available for Dub workspace for now
  // we might open this up to other workspaces in the future
  if (params.slug !== "dub") {
    redirect(`/${params.slug}/settings/integrations`);
  }
  const integration = await prisma.integration.findUnique({
    where: {
      slug: params.integrationSlug,
    },
  });
  if (!integration) {
    redirect(`/${params.slug}/settings/integrations`);
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
