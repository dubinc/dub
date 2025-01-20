import { Grid, Wordmark } from "@dub/ui";
import { useTranslations } from "next-intl";

export default function PartnerOnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("partners.dub.co/(onboarding)");

  return (
    <div className="flex min-h-screen flex-col">
      <div className="fixed inset-0 [mask-image:radial-gradient(60%_60%_at_50%_0%,black,transparent)]">
        <Grid className="text-neutral-200" />
        <div className="absolute inset-0 -translate-y-1/2 -scale-x-100 bg-[conic-gradient(from_-32deg,#f00_0deg,#EAB308_99deg,#5CFF80_162deg,#00FFF9_216deg,#3A8BFD_288deg,#855AFC_360deg)] opacity-25 blur-[200px]" />
      </div>
      <div className="relative z-10 mt-10 flex w-full flex-col items-center justify-center px-3 text-center md:px-8">
        <div className="animate-slide-up-fade relative flex w-auto flex-col items-center [--offset:10px] [animation-duration:1.3s] [animation-fill-mode:both]">
          <Wordmark className="relative h-10" />
          <span className="text-sm font-medium text-neutral-700">
            {t("partner")}
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
