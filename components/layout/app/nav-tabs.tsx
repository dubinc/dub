import { useMemo } from "react";
import Link from "next/link";
import { NextRouter, useRouter } from "next/router";

const TabsHelper = (router: NextRouter): { name: string; href: string }[] => {
  const { slug, key } = router.query as {
    slug?: string;
    key?: string;
  };
  if (key) {
    return [{ name: "← All Links", href: `/${slug || "links"}` }];
  } else if (slug) {
    return [
      { name: "Links", href: `/${slug}` },
      { name: "Settings", href: `/${slug}/settings` },
    ];
  }
  return [
    { name: "Projects", href: `/` },
    { name: "Dub.sh Links", href: `/links` },
  ];
};

export default function NavTabs() {
  const router = useRouter();
  const tabs = useMemo(() => {
    if (!router.isReady) {
      return [];
    } else {
      return TabsHelper(router);
    }
  }, [router.query]);

  return (
    <div className="flex justify-start space-x-8 items-center h-12 -mb-0.5">
      {tabs.map(({ name, href }) => (
        <Link key={href} href={href}>
          <a
            className={`px-1 py-3 border-b-2 ${
              router.asPath === href
                ? "border-black font-semibold"
                : "border-transparent text-gray-700 hover:text-black"
            } transition-all`}
          >
            <p className="text-sm active:scale-95 transition-all duration-75">
              {name}
            </p>
          </a>
        </Link>
      ))}
    </div>
  );
}
