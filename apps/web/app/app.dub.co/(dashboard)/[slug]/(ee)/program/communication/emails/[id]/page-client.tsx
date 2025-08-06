"use client";

import { programEmailSchema } from "@/lib/zod/schemas/program-emails";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

export function ProgramEmailPageClient({ id }: { id: string }) {
  if (id !== "new") return <div>WIP</div>;

  // TODO: Load existing email data

  return <ProgramEmailForm />;
}

type ProgramEmailFormData = z.infer<typeof programEmailSchema>;

const labelClassName = "text-sm font-medium text-content-muted";
const inputClassName =
  "hover:border-border-subtle h-7 w-full rounded-md transition-colors duration-150 focus:border-black/75 border focus:ring-black/75 border-transparent px-1.5 py-0 text-sm text-content-default placeholder:text-content-muted";

function ProgramEmailForm() {
  const searchParams = useSearchParams();

  const form = useForm<ProgramEmailFormData>({
    defaultValues: {
      type:
        (["campaign", "automation"] as const).find(
          (t) => t === searchParams.get("type"),
        ) || "campaign",
      name: "New email",
    },
  });

  const { register, watch, handleSubmit } = form;

  const type = watch("type");

  return (
    <PageContent
      title={`New ${type === "campaign" ? "email" : type}`}
      controls={<></>}
    >
      <PageWidthWrapper className="mb-8 max-w-screen-md">
        <div className="grid grid-cols-[max-content_minmax(0,1fr)] items-center gap-x-6 gap-y-2">
          <label className="contents">
            <span className={labelClassName}>Name</span>
            <input
              type="text"
              placeholder="Enter a name..."
              className={inputClassName}
              {...register("name")}
            />
          </label>

          <label className="contents">
            <span className={labelClassName}>To</span>
            <div />
          </label>

          <label className="contents">
            <span className={labelClassName}>Subject</span>
            <input
              type="text"
              placeholder="Enter a subject..."
              className={inputClassName}
              {...register("subject")}
            />
          </label>

          <label className="contents">
            <span className={labelClassName}>Delivery</span>
            <div />
          </label>
        </div>
      </PageWidthWrapper>
    </PageContent>
  );
}
