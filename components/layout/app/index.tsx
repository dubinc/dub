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
import { HOME_DOMAIN } from "#/lib/constants";
import { useGoogleOauthModal } from "@/components/app/modals/google-oauth-modal";
import { useAcceptInviteModal } from "@/components/app/modals/accept-invite-modal";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { LoadingSpinner } from "#/ui/icons";
import { FileX2 } from "lucide-react";
import BlurImage from "#/ui/blur-image";
import NavTabs from "./nav-tabs";

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

  const { id, name, plan, stripeId, createdAt, error, loading } = useProject();
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

  const { GoogleOauthModal, setShowGoogleOauthModal } = useGoogleOauthModal();
  const { setShowUpgradePlanModal, setShowCMDK } = useContext(ModalContext);
  const { AcceptInviteModal, setShowAcceptInviteModal } =
    useAcceptInviteModal();

  // handle invite and oauth modals
  useEffect(() => {
    if (error && (error.status === 409 || error.status === 410)) {
      setShowAcceptInviteModal(true);
    } else if (
      !loading &&
      session?.user?.email &&
      !session.user?.name &&
      !router.asPath.startsWith("/welcome") &&
      !Cookies.get("hideGoogleOauthModal")
    ) {
      setShowGoogleOauthModal(true);
    }
  }, [error, session, router.asPath]);

  return (
    <div>
      <Meta />
      {error && (error.status === 409 || error.status === 410) && (
        <AcceptInviteModal />
      )}
      <GoogleOauthModal />
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
                {!error && key && (
                  <>
                    <Divider className="h-8 w-8 text-gray-200 sm:mr-3" />
                    <Link
                      href={
                        slug
                          ? `/${slug}/${domain}/${encodeURIComponent(key)}`
                          : `/links/${encodeURIComponent(key)}`
                      }
                      className="text-sm font-medium"
                    >
                      {linkConstructor({
                        domain,
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
        {loading || error?.status === 409 || error?.status === 410 ? (
          <div className="flex h-[calc(100vh-16px)] items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : error?.status === 404 ? (
          <MaxWidthWrapper>
            <div className="my-10 flex flex-col items-center justify-center rounded-md border border-gray-200 bg-white py-12">
              <div className="rounded-full bg-gray-100 p-3">
                <FileX2 className="h-6 w-6 text-gray-600" />
              </div>
              <h1 className="my-3 text-xl font-semibold text-gray-700">
                Project Not Found
              </h1>
              <p className="z-10 max-w-sm text-center text-sm text-gray-600">
                Bummer! The project you are looking for does not exist. You
                either typed in the wrong URL or don't have access to this
                project.
              </p>
              <BlurImage
                src="/_static/illustrations/coffee-call.svg"
                alt="No links yet"
                width={400}
                height={400}
              />
              <Link
                href="/"
                className="z-10 rounded-md border border-black bg-black px-10 py-2 text-sm font-medium text-white transition-all duration-75 hover:bg-white hover:text-black"
              >
                Back to my projects
              </Link>
            </div>
          </MaxWidthWrapper>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
