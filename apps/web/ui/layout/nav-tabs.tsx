"use client";

import useDomains from "@/lib/swr/use-domains";
import useLinksCount from "@/lib/swr/use-links-count";
import useProject from "@/lib/swr/use-project";
import useUsers from "@/lib/swr/use-users";
import { ModalContext } from "@/ui/modals/provider";
import { Badge } from "@dub/ui";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { useContext, useMemo } from "react";

export default function NavTabs() {
  const pathname = usePathname();
  const { slug } = useParams() as { slug?: string };
  const searchParams = useSearchParams();
  const { loading, error } = useProject();

  const tabs = useMemo(() => {
    if (slug) {
      return [
        { name: "Links", href: `/${slug}` },
        { name: "Analytics", href: `/${slug}/analytics` },
        { name: "Domains", href: `/${slug}/domains` },
        { name: "Settings", href: `/${slug}/settings` },
      ];
    }
    if (pathname === "/analytics") {
      return [{ name: "← Back to all links", href: "/links" }];
    }
    return [
      { name: "Projects", href: "/" },
      { name: "Links", href: "/links" },
      { name: "Settings", href: "/settings" },
    ];
  }, [pathname, slug, searchParams]);

  const { verified, loading: loadingDomains } = useDomains();
  const { data: count } = useLinksCount();

  if (error) return null;

  return (
    <div className="scrollbar-hide mb-[-3px] flex h-12 items-center justify-start space-x-2 overflow-x-auto">
      {tabs.map(({ name, href }) => (
        <Link key={href} href={href} className="relative p-1">
          <div className="rounded-md px-3 py-2 transition-all duration-75 hover:bg-gray-100 active:bg-gray-200">
            <p className="text-sm text-gray-600 hover:text-black">{name}</p>
          </div>
          {(pathname === href ||
            (href.endsWith("/settings") && pathname?.startsWith(href))) && (
            <motion.div
              layoutId="indicator"
              transition={{
                duration: 0.25,
              }}
              className="absolute bottom-0 h-0.5 w-full bg-black"
            />
          )}
        </Link>
      ))}
      {slug &&
        !loading &&
        !error &&
        !loadingDomains &&
        (!verified || count === 0) && <OnboardingChecklist />}
    </div>
  );
}
const OnboardingChecklist = () => {
  const { setShowCompleteSetupModal } = useContext(ModalContext);
  const { verified } = useDomains();
  const { data: links } = useLinksCount();
  const { users } = useUsers();
  const { users: invites } = useUsers({ invites: true });

  const remainder = useMemo(() => {
    return (
      (verified ? 0 : 1) +
      (links > 0 ? 0 : 1) +
      ((users && users.length > 1) || (invites && invites.length > 0) ? 0 : 1)
    );
  }, [links, invites, users, verified]);

  return (
    <button
      onClick={() => setShowCompleteSetupModal(true)}
      className="flex items-center space-x-2 rounded-md border-b-2 border-transparent p-1 px-3 py-2 transition-all duration-75 hover:bg-gray-100 active:bg-gray-200"
    >
      <p className="whitespace-nowrap text-sm text-gray-600">
        Onboarding Checklist
      </p>
      <Badge variant="blue">{remainder.toString()}</Badge>
    </button>
  );
};
