import { prisma } from "@/lib/prisma";
import { Button } from "@dub/ui";
import { Program } from "@prisma/client";
import { notFound } from "next/navigation";

export async function ProgramOverview({ programId }: { programId: string }) {
  // TODO:
  // Check program is owned by the partner

  const program = await prisma.program.findUnique({
    where: {
      id: programId,
    },
  });

  if (!program) {
    notFound();
  }

  return (
    <div className="flex flex-col divide-y divide-neutral-200 rounded-md border border-neutral-200 bg-[#f9f9f9]">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-neutral-500">
            Sign up page
          </span>
          <span className="text-sm font-medium leading-none text-neutral-900">
            partner.dub.co/{program?.slug}
          </span>
        </div>

        <div className="flex items-center justify-between gap-5 divide-x divide-neutral-200">
          <div className="flex flex-col gap-1 text-right">
            <span className="text-xs font-medium text-neutral-500">
              Commission
            </span>
            <span className="text-sm font-medium leading-none text-neutral-900">
              {program.commissionAmount}
              {program.commissionType === "percentage" ? "%" : "$"}
            </span>
          </div>

          <div className="flex flex-col gap-1 pl-5 text-right">
            <span className="text-xs font-medium text-neutral-500">
              Cookie length
            </span>
            <span className="text-sm font-medium leading-none text-neutral-900">
              {program.cookieLength} days
            </span>
          </div>

          <div className="flex flex-col gap-1 pl-5 text-right">
            <span className="text-xs font-medium text-neutral-500">
              Min payout
            </span>
            <span className="text-sm font-medium leading-none text-neutral-900">
              ${program.minimumPayout}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center px-4 py-4">
        <div
          className="flex-1 text-sm leading-none text-neutral-900"
          dangerouslySetInnerHTML={{
            __html: commissionDescription(program),
          }}
        />
        <Button className="h-8 w-fit" text="Edit program" />
      </div>
    </div>
  );
}

const commissionDescription = (program: Program) => {
  const texts = ["Earn"];

  if (program.commissionType === "flat") {
    texts.push(
      `<span class="font-semibold text-blue-600">${program.commissionAmount}</span>`,
    );
  } else {
    texts.push(
      `<span class="font-semibold text-blue-600">${program.commissionAmount}%</span>`,
    );
  }

  texts.push("for each conversion");

  if (program.recurringCommission) {
    if (program.isLifetimeRecurring) {
      texts.push(
        "and again for all future renewals throughout <span class='font-semibold'>the customer's lifetime</span>",
      );
    } else {
      texts.push(
        `and again for all renewals during the first <span class='font-semibold'>${program.recurringDuration} months</span>`,
      );
    }
  }

  return `${texts.join(" ")}.`;
};
