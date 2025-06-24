"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { Button } from "@dub/ui";
import { useRouter } from "next/navigation";
import { IntegrationGuide, IntegrationType } from "./integrations";
import { Markdown } from "./markdown";

interface GuideProps {
  selectedGuide: IntegrationGuide;
  markdown: string | null;
}

const integrationTypeToTitle: Record<IntegrationType, string> = {
  "client-sdk": "client-side script",
  "server-sdk": "server-side script",
  "track-leads": "tracking lead events",
  "track-sales": "tracking sale events",
};

export function Guide({ selectedGuide, markdown }: GuideProps) {
  const router = useRouter();
  const { slug: workspaceSlug } = useWorkspace();

  if (!markdown) {
    return null;
  }

  const Icon = selectedGuide.icon;

  return (
    <>
      <hr className="mb-6 border-neutral-200" />
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <Icon className="size-8" />
          <Button
            text="Select another method"
            variant="secondary"
            className="h-8 w-fit rounded-lg px-3"
            type="button"
            onClick={() => router.push(`/${workspaceSlug}/program/new/connect`)}
          />
        </div>

        <div className="flex flex-col">
          <span className="text-sm font-medium leading-5 text-neutral-500">
            Set up {integrationTypeToTitle[selectedGuide.type]}
          </span>
          <span className="text-xl font-semibold leading-7 text-neutral-900">
            Instructions for {selectedGuide.title}
          </span>
        </div>

        <div className="space-y-6 rounded-2xl bg-white p-0 shadow-none">
          <Markdown>{markdown}</Markdown>

          <Button
            text="I've completed this"
            className="w-full"
            type="button"
            onClick={() => router.back()}
          />
        </div>
      </div>
    </>
  );
}
