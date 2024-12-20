import { currencyFormatter, nFormatter } from "@dub/utils";

export function Activity({
  clicks,
  leads,
  earnings,
}: {
  clicks: number;
  leads: number;
  earnings: number;
}) {
  return (
    <div className="mt-3 grid grid-cols-3 gap-2">
      {[
        { label: "Clicks", value: clicks },
        { label: "Signups", value: leads },
        { label: "Total earned", value: earnings },
      ].map(({ label, value }) => (
        <div className="flex flex-col gap-1.5 rounded-lg bg-neutral-100 p-2">
          <span className="text-xs text-neutral-500">{label}</span>
          <span className="text-sm font-semibold text-neutral-600">
            {label === "Total earned"
              ? currencyFormatter(value / 100, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : nFormatter(value)}
          </span>
        </div>
      ))}
    </div>
  );
}
