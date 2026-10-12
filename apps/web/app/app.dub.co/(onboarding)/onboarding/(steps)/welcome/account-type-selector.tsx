"use client";

import { testIds } from "@/lib/e2e/test-ids";
import { Button, buttonVariants, MoneyBills2, Shop } from "@dub/ui";
import { cn, PARTNERS_DOMAIN } from "@dub/utils";
import { useOnboardingProgress } from "../../use-onboarding-progress";

const SPRITE_AVATAR_COUNT = 4;

const accountTypes = [
  {
    type: "brand",
    icon: Shop,
    title: "For brands",
    description:
      "Brands managing partner programs and short links. Generate links, track performance, and payouts in one place.",
    sprite: "https://assets.dub.co/cms/onboarding-brands.png",
    socialProof: "Brands growing with Dub",
  },
  {
    type: "partner",
    icon: MoneyBills2,
    title: "For partners",
    description:
      "Earn money by promoting brands you love. Find programs, share your links, and track your earnings in one place.",
    sprite: "https://assets.dub.co/cms/onboarding-partners.png",
    socialProof: "Partners earning on Dub",
  },
] as const;

export function AccountTypeSelector() {
  const { continueTo, isLoading, isSuccessful } = useOnboardingProgress();

  return (
    <div className="grid w-full gap-4 pt-2 sm:grid-cols-2">
      {accountTypes.map(
        ({ type, icon: Icon, title, description, sprite, socialProof }) => (
          <div
            key={type}
            className="flex flex-col rounded-xl border border-neutral-200 bg-neutral-100"
          >
            <div className="-m-px flex grow flex-col gap-6 rounded-xl border border-neutral-200 bg-white p-5">
              <div className="flex size-10 items-center justify-center rounded-lg border border-black/5 bg-neutral-100">
                <Icon className="size-[22px] text-neutral-900" />
              </div>
              <div className="flex grow flex-col gap-1">
                <h2 className="text-base font-semibold text-neutral-900">
                  {title}
                </h2>
                <p className="text-sm text-neutral-600">{description}</p>
              </div>
              {/* Partners onboard on the partners domain, where middleware sends them
                  to /programs if they have a profile, or to partner onboarding if not */}
              {type === "brand" ? (
                <Button
                  variant="primary"
                  className="h-9 rounded-lg"
                  text="Continue as a brand"
                  onClick={() => continueTo("workspace")}
                  loading={isLoading || isSuccessful}
                  data-testid={testIds.onboarding.getStarted}
                />
              ) : (
                <a
                  href={`${PARTNERS_DOMAIN}/onboarding`}
                  className={cn(
                    buttonVariants({ variant: "primary" }),
                    "flex h-9 items-center justify-center whitespace-nowrap rounded-lg border px-4 text-sm",
                  )}
                  data-testid={testIds.onboarding.continueAsPartner}
                >
                  Continue as a partner
                </a>
              )}
            </div>
            <div className="flex items-center justify-center gap-2 p-2">
              <SpriteAvatars sprite={sprite} />
              <span className="text-xs font-semibold text-neutral-600">
                {socialProof}
              </span>
            </div>
          </div>
        ),
      )}
    </div>
  );
}

// Each sprite sheet is a single row of square tiles, one per avatar
function SpriteAvatars({ sprite }: { sprite: string }) {
  return (
    <div className="flex items-center -space-x-0.5" aria-hidden="true">
      {[...Array(SPRITE_AVATAR_COUNT)].map((_, idx) => (
        <span
          key={idx}
          className="relative size-[22px] rounded-full bg-neutral-200 bg-[length:88px_22px] bg-no-repeat ring-2 ring-neutral-100"
          style={{
            backgroundImage: `url(${sprite})`,
            backgroundPosition: `${idx * -22}px 0`,
            zIndex: SPRITE_AVATAR_COUNT - idx,
          }}
        />
      ))}
    </div>
  );
}
