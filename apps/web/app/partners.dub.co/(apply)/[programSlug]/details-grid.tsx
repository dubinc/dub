import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import { Program } from "@dub/prisma/client";
import { Calendar6, MoneyBills2 } from "@dub/ui/icons";
import { cn, INFINITY_NUMBER, pluralize } from "@dub/utils";

export function DetailsGrid({
  program,
  className,
}: {
  program: Program;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", className)}>
      {[
        {
          icon: MoneyBills2,
          title: "Commission",
          value: constructRewardAmount({
            amount: program.commissionAmount,
            type: program.commissionType,
          }),
        },
        {
          icon: Calendar6,
          title: "Duration",
          value:
            program.commissionDuration === INFINITY_NUMBER
              ? "Lifetime"
              : `${program.commissionDuration} ${pluralize(
                  program.commissionInterval || "cycle",
                  program.commissionDuration || 0,
                )}`,
        },
      ].map(({ icon: Icon, title, value }) => (
        <div className="rounded-xl bg-neutral-100 p-4">
          <Icon className="size-5 text-gray-500" />
          <div className="mt-6">
            <p className="font-mono text-xl text-neutral-900">{value}</p>
            <p className="mt-0.5 text-sm text-gray-500">{title}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
