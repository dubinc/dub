import { PageContent } from "@/ui/layout/page-content";
import { ShieldKeyhole } from "@dub/ui";
import { formatDate } from "@dub/utils";
import { subDays } from "date-fns";
import { ComingSoonPage } from "../coming-soon-page";

const EXAMPLE_RISKS = [
  {
    title: "Suspicious self-referral",
    avatarIndex: 2,
    name: "Olivia Carter",
    date: subDays(new Date(), 1),
  },
  {
    title: "Potential fraud",
    avatarIndex: 12,
    name: "Liam Johnson",
    date: subDays(new Date(), 3),
  },
];

export default function ProgramFraudRiskPage() {
  return (
    <PageContent title="Fraud & Risk">
      <ComingSoonPage
        title="Fraud & Risk"
        description="Discover fraudulent referrals, suspicious partner traffic, and other partner risks to keep your program running smooth."
        graphic={
          <div
            className="flex w-full max-w-[400px] select-none flex-col gap-2 [mask-image:linear-gradient(black,transparent)]"
            aria-hidden
          >
            {EXAMPLE_RISKS.map((risk, idx) => (
              <div
                key={idx}
                className="border-subtle flex w-full items-start gap-3 rounded-xl border p-5 text-sm"
              >
                <div className="relative flex size-8 shrink-0 items-center justify-center rounded-full border border-neutral-200">
                  <div className="absolute inset-0 rounded-full border border-white bg-gradient-to-t from-neutral-100" />
                  <ShieldKeyhole className="text-content-subtle relative size-4" />
                </div>

                <div className="flex grow flex-col gap-1.5">
                  <span className="text-content-emphasis font-semibold">
                    {risk.title}
                  </span>
                  <div className="flex items-center gap-2">
                    <div
                      className="size-5 shrink-0 rounded-full bg-neutral-300"
                      style={{
                        backgroundImage:
                          "url(https://assets.dub.co/partners/partner-images.jpg)",
                        backgroundSize: "1400%", // 14 images
                        backgroundPositionX:
                          (14 - (risk.avatarIndex % 14)) * 100 + "%",
                      }}
                    />
                    <span className="text-content-subtle">{risk.name}</span>
                    <span className="text-content-muted">
                      {formatDate(risk.date, { month: "short" })}
                    </span>
                  </div>
                </div>

                <div className="hidden shrink-0 sm:block">
                  <div className="bg-bg-inverted text-content-inverted flex h-7 items-center rounded-lg px-2.5 text-sm font-medium">
                    Review
                  </div>
                </div>
              </div>
            ))}
          </div>
        }
      />
    </PageContent>
  );
}
