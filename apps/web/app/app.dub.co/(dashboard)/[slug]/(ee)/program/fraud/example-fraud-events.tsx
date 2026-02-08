import { FRAUD_RULES_BY_TYPE } from "@/lib/api/fraud/constants";
import { FraudRuleType } from "@dub/prisma/client";
import { Button, ShieldKeyhole } from "@dub/ui";
import { formatDate, OG_AVATAR_URL } from "@dub/utils";

const EXAMPLE_FRAUD_EVENTS: {
  type: FraudRuleType;
  partnerName: string;
  date: Date;
}[] = [
  {
    type: "paidTrafficDetected",
    partnerName: "Olivia Carter",
    date: new Date("2025-11-10"),
  },
  {
    type: "referralSourceBanned",
    partnerName: "Sarah Johnson",
    date: new Date("2025-11-08"),
  },
];

interface ExampleFraudEventProps {
  type: FraudRuleType;
  partnerName: string;
  date: Date;
}

export function ExampleFraudEvents() {
  return (
    <div
      className="flex w-full max-w-md flex-col gap-4 overflow-hidden px-4 [mask-image:linear-gradient(black_80%,transparent)]"
      aria-hidden
    >
      {EXAMPLE_FRAUD_EVENTS.map((event, idx) => (
        <ExampleFraudEvent key={idx} event={event} />
      ))}
    </div>
  );
}

function ExampleFraudEvent({ event }: { event: ExampleFraudEventProps }) {
  const rule = FRAUD_RULES_BY_TYPE[event.type];

  return (
    <div className="flex w-full select-none items-center justify-between gap-4 overflow-hidden rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50">
          <ShieldKeyhole className="size-5 text-neutral-600" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="text-sm font-semibold text-neutral-900">
            {rule.name}
          </span>
          <div className="flex items-center gap-2">
            <img
              src={`${OG_AVATAR_URL}${event.partnerName}`}
              alt={event.partnerName}
              className="size-5 shrink-0 rounded-full bg-white"
            />
            <span className="text-content-default whitespace-nowrap text-sm font-medium">
              {event.partnerName}
            </span>
            <span className="font-inter whitespace-nowrap text-sm text-neutral-400">
              {formatDate(event.date, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0">
        <Button
          type="button"
          text="Review"
          variant="primary"
          className="bg-bg-inverted text-content-inverted h-7 cursor-default rounded-lg px-2.5 py-2"
        />
      </div>
    </div>
  );
}
