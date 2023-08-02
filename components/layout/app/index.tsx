import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode, useContext, useEffect, useState } from "react";
import { Divider } from "@/components/shared/icons";
import Logo from "#/ui/icons/logo";
import Meta from "../meta";
import ProjectSelect from "./project-select";
import UserDropdown from "./user-dropdown";
import useProject from "#/lib/swr/use-project";
import { Crisp } from "crisp-sdk-web";
import { useSession } from "next-auth/react";
import ProBanner from "./pro-banner";
import Cookies from "js-cookie";
import { ModalContext } from "#/ui/modal-provider";
import Badge from "#/ui/badge";
import { linkConstructor } from "#/lib/utils";
import { HelpCircle } from "lucide-react";
import { HOME_DOMAIN } from "#/lib/constants";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

const NavTabs = dynamic(() => import("./nav-tabs"), {
  ssr: false,
  loading: () => <div className="-mb-0.5 h-12 w-full" />,
}); // dynamic import to avoid react hydration mismatch error

export default function AppLayout({
  children,
  bgWhite,
}: {
  children: ReactNode;
  bgWhite?: boolean;
}) {
  const router = useRouter();
  const { slug, domain, key } = router.query as {
    slug?: string;
    domain?: string;
    key?: string;
  };

  useEffect(() => {
    Crisp.configure("2c09b1ee-14c2-46d1-bf72-1dbb998a19e0", {
      autoload: false,
    });
  }, []);

  const { data: session } = useSession();
  useEffect(() => {
    if (session?.user?.email) {
      Crisp.user.setEmail(session.user.email);
      Crisp.user.setNickname(session.user.name || session.user.email);
    }
  }, [session]);

  const { id, name, plan, stripeId, createdAt } = useProject();
  const [showProBanner, setShowProBanner] = useState<boolean | null>(null);

  useEffect(() => {
    if (plan) {
      Crisp.session.setData({
        projectId: id,
        projectName: name,
        projectSlug: slug,
        plan,
        ...(stripeId && { stripeId }),
      });
      /* show pro banner if:
          - free plan
          - not hidden by user for this project 
          - project is created more than 24 hours ago
      */
      if (
        plan === "free" &&
        Cookies.get("hideProBanner") !== slug &&
        createdAt &&
        Date.now() - new Date(createdAt).getTime() > 24 * 60 * 60 * 1000
      ) {
        setShowProBanner(true);
      } else {
        setShowProBanner(false);
      }
    }
  }, [plan, id, name, slug, stripeId, createdAt]);

  const { setShowUpgradePlanModal, setShowCMDK } = useContext(ModalContext);

  return (
    <div>
      <Meta />
      {showProBanner && <ProBanner setShowProBanner={setShowProBanner} />}
      <div
        className={`min-h-screen w-full ${bgWhite ? "bg-white" : "bg-gray-50"}`}
      >
        <div className="sticky left-0 right-0 top-0 z-20 border-b border-gray-200 bg-white">
          <MaxWidthWrapper>
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center">
                <Link href="/">
                  <Logo className="h-8 w-8 transition-all duration-75 active:scale-95" />
                </Link>
                <Divider className="h-8 w-8 text-gray-200 sm:ml-3" />
                <ProjectSelect />
                {key && (
                  <>
                    <Divider className="h-8 w-8 text-gray-200 sm:mr-3" />
                    <Link
                      href={
                        slug ? `/${slug}/${domain}/${key}` : `/links/${key}`
                      }
                      className="text-sm font-medium"
                    >
                      {linkConstructor({
                        domain: domain || "dub.sh",
                        key,
                        pretty: true,
                      })}
                    </Link>
                  </>
                )}
                {plan === "free" && showProBanner === false && (
                  <button
                    onClick={() => setShowUpgradePlanModal(true)}
                    className="mb-1 ml-3 hidden sm:block"
                  >
                    <Badge
                      text="Upgrade to Pro"
                      variant="blue"
                      className="px-3 py-1"
                    />
                  </button>
                )}
              </div>
              <div className="flex items-center space-x-6">
                <a
                  href={`${HOME_DOMAIN}/changelog`}
                  className="hidden text-sm text-gray-500 transition-colors hover:text-gray-700 md:block"
                  target="_blank"
                >
                  Changelog
                </a>
                <button
                  onClick={() => setShowCMDK(true)}
                  className="hidden text-sm text-gray-500 transition-colors hover:text-gray-700 md:block"
                >
                  Help
                </button>
                <UserDropdown />
              </div>
            </div>
            <NavTabs />
          </MaxWidthWrapper>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
