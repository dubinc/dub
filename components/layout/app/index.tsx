import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import Script from "next/script";
import { ReactNode } from "react";
import { Toaster } from "react-hot-toast";
import { Divider, Logo } from "@/components/shared/icons";
import Meta from "../meta";
import ProjectSelect from "./project-select";
import UserDropdown from "./user-dropdown";

const CRISP_SCRIPT = `window.$crisp=[];window.CRISP_WEBSITE_ID="2c09b1ee-14c2-46d1-bf72-1dbb998a19e0";(function(){d=document;s=d.createElement("script");s.src="https://client.crisp.chat/l.js";s.async=1;d.getElementsByTagName("head")[0].appendChild(s);})();`;

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
  const { slug, key } = router.query as {
    slug?: string;
    key?: string;
  };

  return (
    <div>
      <Meta />
      <Script
        id="script-crisp"
        dangerouslySetInnerHTML={{
          __html: CRISP_SCRIPT,
        }}
        strategy="lazyOnload"
      />
      <Toaster />
      <div
        className={`min-h-screen w-full ${bgWhite ? "bg-white" : "bg-gray-50"}`}
      >
        <div className="sticky top-0 left-0 right-0 z-30 border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-screen-xl px-2.5 md:px-20">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center">
                <Link href="/">
                  <Logo className="h-8 w-8 transition-all duration-75 active:scale-95" />
                </Link>
                <Divider className="h-8 w-8 text-gray-200 sm:ml-3" />
                <ProjectSelect />
                {key && slug && (
                  <>
                    <Divider className="h-8 w-8 text-gray-200 sm:mr-3" />
                    <Link
                      href={`/${slug}/${key}`}
                      className="text-sm font-medium"
                    >
                      {key}
                    </Link>
                  </>
                )}
              </div>
              <UserDropdown />
            </div>
            <NavTabs />
          </div>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
