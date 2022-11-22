import ErrorPage from "next/error";
import Link from "next/link";
import { useRouter } from "next/router";
import AppLayout from "components/layout/app";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import useProject from "@/lib/swr/use-project";
import { useAcceptInviteModal } from "@/components/app/modals/accept-invite-modal";
import { ReactNode, useEffect } from "react";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { slug } = router.query as {
    slug?: string;
  };
  const { error } = useProject();
  const { AcceptInviteModal, setShowAcceptInviteModal } =
    useAcceptInviteModal();

  // handle errors
  useEffect(() => {
    if (error && (error.status === 409 || error.status === 410)) {
      setShowAcceptInviteModal(true);
    }
  }, [error]);

  if (error && error.status === 404) {
    return <ErrorPage statusCode={404} />;
  }

  const tabs = [
    {
      name: "General",
      href: `/${slug}/settings`,
    },
    {
      name: "People",
      href: `/${slug}/settings/people`,
    },
  ];

  return (
    <AppLayout bgWhite>
      {error && (error.status === 409 || error.status === 410) && (
        <AcceptInviteModal />
      )}
      <div className="flex h-36 items-center border-b border-gray-200 bg-white">
        <MaxWidthWrapper>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl text-gray-600">Settings</h1>
          </div>
        </MaxWidthWrapper>
      </div>
      <MaxWidthWrapper className="grid items-start gap-5 py-10 md:grid-cols-5">
        <div className="flex gap-1 md:grid">
          {tabs.map(({ name, href }) => (
            <Link
              href={href}
              key={href}
              className={`${
                router.asPath === href ? "font-semibold text-black" : ""
              } rounded-md p-2.5 text-sm transition-all duration-75 hover:bg-gray-100 active:bg-gray-200`}
            >
              {name}
            </Link>
          ))}
        </div>
        <div className="grid gap-5 md:col-span-4">{children}</div>
      </MaxWidthWrapper>
    </AppLayout>
  );
}
