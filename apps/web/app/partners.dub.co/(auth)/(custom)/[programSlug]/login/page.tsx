import { FramerButton } from "@/ui/auth/login/framer-button";
import { APP_DOMAIN, constructMetadata } from "@dub/utils";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = constructMetadata({
  title: `Sign in to Framer Partners`,
  canonicalUrl: `${APP_DOMAIN}/login`,
});

export default function CustomPartnerLoginPage({
  params: { programSlug },
}: {
  params: { programSlug: string };
}) {
  const t = useTranslations(
    "partners.dub.co/(auth)/(custom)/[programSlug]/login",
  );

  if (programSlug !== "framer") {
    redirect("/login");
  }

  return (
    <div className="mx-auto my-10 flex w-full max-w-sm flex-col gap-8">
      <div className="animate-slide-up-fade relative flex w-auto flex-col items-center [--offset:10px] [animation-duration:1.3s] [animation-fill-mode:both]">
        <img
          src="https://assets.dub.co/testimonials/companies/framer.svg"
          alt={t("framer-logo")}
          className="h-8"
        />
      </div>
      <div className="animate-slide-up-fade flex flex-col items-center justify-center gap-2 [--offset:10px] [animation-delay:0.15s] [animation-duration:1.3s] [animation-fill-mode:both]">
        <h1 className="text-lg font-medium text-neutral-800">
          {t("sign-in-framer-partners")}
        </h1>
        <p className="text-center text-sm text-neutral-700">
          {t("not-a-framer-partner-apply-today", {
            component0: (
              <Link
                href="/framer/apply"
                className="font-normal underline underline-offset-2 transition-colors hover:text-black"
              >
                {t("not-a-framer-partner-apply-today_component0")}
              </Link>
            ),
          })}
        </p>
      </div>

      <div className="animate-slide-up-fade [--offset:10px] [animation-delay:0.3s] [animation-duration:1.3s] [animation-fill-mode:both]">
        <FramerButton />
      </div>
    </div>
  );
}
