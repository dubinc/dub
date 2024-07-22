"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { buttonVariants, MaxWidthWrapper } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { redirect } from "next/navigation";
import AddEditIntegrationForm from "../../../../../../ui/integrations/add-edit-integration-form";

export default function NewIntegrationPageClient() {
  const { slug: workspaceSlug, flags } = useWorkspace();

  if (!flags?.integrations) {
    redirect(`/${workspaceSlug}`);
  }

  return (
    <>
      <div className="flex h-36 w-full items-center border-b border-gray-200 bg-white">
        <MaxWidthWrapper>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight text-black">
              Integrations
            </h1>
            <div className="flex gap-2">
              <Link
                href={`/${workspaceSlug}/integrations/manage`}
                className={cn(
                  buttonVariants({ variant: "secondary" }),
                  "flex h-10 items-center justify-center whitespace-nowrap rounded-lg border px-4 text-sm",
                )}
              >
                My Integrations
              </Link>
            </div>
          </div>
        </MaxWidthWrapper>
      </div>

      <MaxWidthWrapper className="my-10 grid max-w-screen-lg gap-8">
        <AddEditIntegrationForm integration={null} />
      </MaxWidthWrapper>
    </>
  );
}
