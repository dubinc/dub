import AddEditIntegrationForm from "@/ui/oauth-apps/add-edit-integration-form";
import { prisma } from "@dub/prisma";
import { MaxWidthWrapper } from "@dub/ui";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
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
      <Link
        href={`/${params.slug}/settings/integrations`}
        className="flex items-center gap-x-1"
      >
        <ChevronLeft className="size-4" />
        <p className="text-sm font-medium text-gray-500">
          Back to integrations
        </p>
      </Link>

      <AddEditIntegrationForm
        integration={{
          ...integration,
          screenshots: integration.screenshots as string[],
        }}
      />
    </MaxWidthWrapper>
  );
}
