"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { AddEditDomainForm } from "@/ui/domains/add-edit-domain-form";
import { useRouter } from "next/navigation";

export function Form() {
  const { slug } = useWorkspace();
  const router = useRouter();

  return (
    <div>
      <AddEditDomainForm
        onSuccess={() => {
          router.push(`/onboarding/invite?slug=${slug}`);
        }}
      />
      <button
        type="button"
        onClick={() => router.push(`/onboarding/invite?slug=${slug}`)}
        className="mt-4 w-full text-center text-sm text-gray-500 transition-colors hover:text-gray-700"
      >
        I'll do this later
      </button>
    </div>
  );
}
