import { ProgramApplicationFormData } from "@/lib/types";
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
      <p className="font-mono text-xs font-medium uppercase text-[var(--brand)]">
        {label}
      </p>
      <Heading className="text-4xl font-semibold">{title}</Heading>
      <p className="text-base text-neutral-700">{description}</p>
    </div>
  );
}
