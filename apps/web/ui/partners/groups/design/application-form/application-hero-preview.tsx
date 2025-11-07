import { ProgramApplicationFormData } from "@/lib/types";
import { BlockMarkdown } from "@/ui/partners/lander/blocks/block-markdown";
import { Program } from "@prisma/client";

export function ApplicationFormHero({
  program,
  applicationFormData,
  preview,
}: {
  program: Pick<Program, "name">;
  applicationFormData: Pick<
    ProgramApplicationFormData,
    "label" | "title" | "description"
  >;
  preview?: boolean;
}) {
  const Heading = preview ? "div" : "h1";
  const label =
    applicationFormData.label || `${program.name} Affiliate Program`;
  const title = applicationFormData.title || `Apply to ${program.name}`;
  const description =
    applicationFormData.description ||
    `Submit your application to join the ${program.name} affiliate program and start earning commissions for your referrals.`;

  return (
    <div className="grid grid-cols-1 gap-5 py-6 sm:mt-14">
      <span className="w-fit rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700">
        Step 1 of 2
      </span>
      {/* <p className="font-mono text-xs font-medium uppercase text-[var(--brand)]">
        {label}
      </p> */}
      <Heading className="text-4xl font-semibold">{title}</Heading>
      <BlockMarkdown>{description}</BlockMarkdown>
    </div>
  );
}
