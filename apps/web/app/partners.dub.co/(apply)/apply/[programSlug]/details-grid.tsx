import { Program } from "@dub/prisma";
import { Calendar6, MoneyBills2 } from "@dub/ui/src/icons";
import { cn, currencyFormatter } from "@dub/utils";

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
          value:
            program.commissionType === "percentage"
              ? `${program.commissionAmount}%`
              : currencyFormatter(program.commissionAmount / 100, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }),
        },
        {
          icon: Calendar6,
          title: "Duration",
          value: program.isLifetimeRecurring
            ? "Lifetime"
            : `${program.recurringDuration} ${program.recurringInterval}s`,
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
