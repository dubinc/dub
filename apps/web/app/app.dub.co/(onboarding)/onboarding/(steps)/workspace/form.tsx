"use client";

import { CreateWorkspaceForm } from "@/ui/workspaces/create-workspace-form";
import { useRouter } from "next/navigation";

export function Form() {
  const router = useRouter();

  return (
    <CreateWorkspaceForm
      className="mt-8 w-full"
      onSuccess={({ slug }) => {
        router.push(`/onboarding/link?slug=${slug}`);
      }}
    />
  );
}
