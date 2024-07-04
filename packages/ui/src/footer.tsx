"use client";

import { ALL_TOOLS, COMPARE_PAGES, cn, fetcher } from "@dub/utils";
import va from "@vercel/analytics";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { FEATURES_LIST } from "./content";
import { Github, LinkedIn, Twitter, YouTube } from "./icons";
import { MaxWidthWrapper } from "./max-width-wrapper";
import { NavLogo } from "./nav-logo";

const navigation = {
  features: FEATURES_LIST.map(({ title, href }) => ({
    name: title,
    href,
  })),
  product: [
    { name: "Blog", href: "/blog" },
    { name: "Brand", href: "/brand" },
    { name: "Changelog", href: "/changelog" },
    { name: "Customers", href: "/customers" },
    { name: "Enterprise", href: "/enterprise" },
    { name: "Pricing", href: "/pricing" },
    { name: "Help Center", href: "/help" },
  ],
  compare: COMPARE_PAGES.map(({ name, slug }) => ({
    name,
    href: `/compare/${slug}`,
  })),
  legal: [
    { name: "Privacy", href: "/privacy" },
    { name: "Terms", href: "/terms" },
    { name: "Abuse", href: "/abuse" },
  ],
  tools: ALL_TOOLS.map(({ name, slug }) => ({
    name,
    href: `/tools/${slug}`,
  })),
};

export function Footer() {
  const { domain = "dub.co" } = useParams() as { domain: string };

  const createHref = (href: string) =>
    domain === "dub.co" ? href : `https://dub.co${href}`;

  return (
    <footer>
      <MaxWidthWrapper className="relative z-10 overflow-hidden border border-b-0 border-gray-200 bg-white/50 pb-60 pt-16 backdrop-blur-lg md:rounded-t-2xl">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="space-y-6">
            <Link
              href={createHref("/")}
              {...(domain !== "dub.co" && {
                onClick: () => {
                  va.track("Referred from custom domain", {
                    domain,
                    medium: "footer item (logo)",
                  });
                },
              })}
              className="block max-w-fit"
            >
              <span className="sr-only">
                {process.env.NEXT_PUBLIC_APP_NAME} Logo
              </span>
              <NavLogo className="h-8 text-gray-800" />
            </Link>
            <p className="max-w-xs text-sm text-gray-500">
              Giving modern marketing teams superpowers with short links that
              stand out.
            </p>
            <p className="text-sm leading-5 text-gray-400">
              © {new Date().getFullYear()} Dub Technologies, Inc.
            </p>
            <div className="flex items-center space-x-3">
              <a
                href="https://twitter.com/dubdotco"
                target="_blank"
                rel="noreferrer"
                className="group rounded-full border border-gray-200 p-2 transition-colors hover:bg-gray-100"
              >
                <span className="sr-only">Twitter</span>
                <Twitter className="h-4 w-4 text-gray-600 transition-colors group-hover:text-black" />
              </a>
              <a
                href="https://github.com/dubinc/dub"
                target="_blank"
                rel="noreferrer"
                className="group rounded-full border border-gray-200 p-2 transition-colors hover:bg-gray-100"
              >
                <span className="sr-only">Github</span>
                <Github className="h-4 w-4 text-gray-600 transition-colors group-hover:text-black" />
              </a>
              <a
                href="https://www.linkedin.com/company/dubinc"
                target="_blank"
                rel="noreferrer"
                className="group rounded-full border border-gray-200 p-2 transition-colors hover:bg-gray-100"
              >
                <span className="sr-only">LinkedIn</span>
                <LinkedIn className="h-4 w-4 text-gray-600 transition-colors group-hover:text-[#0077b5]" />
              </a>
              <a
                href="https://www.youtube.com/@dubdotco"
                target="_blank"
                rel="noreferrer"
                className="group rounded-full border border-gray-200 p-2 transition-colors hover:bg-gray-100"
              >
                <span className="sr-only">YouTube</span>
                <YouTube className="h-4 w-4 text-gray-600 transition-colors group-hover:text-[#ff0000]" />
              </a>
            </div>
            <StatusBadge />
          </div>
          <div className="mt-16 grid grid-cols-2 gap-4 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">
                  Features
                </h3>
                <ul role="list" className="mt-4 space-y-4">
                  {navigation.features.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={createHref(item.href)}
                        {...(domain !== "dub.co" && {
                          onClick: () => {
                            va.track("Referred from custom domain", {
                              domain,
                              medium: `footer item (${item.name})`,
                            });
                          },
                        })}
                        className="text-sm text-gray-500 hover:text-gray-800"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold text-gray-800">Product</h3>
                <ul role="list" className="mt-4 space-y-4">
                  {navigation.product.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={createHref(item.href)}
                        {...(domain !== "dub.co" && {
                          onClick: () => {
                            va.track("Referred from custom domain", {
                              domain,
                              medium: `footer item (${item.name})`,
                            });
                          },
                        })}
                        className="text-sm text-gray-500 hover:text-gray-800"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="md:grid md:grid-cols-2">
              <div className="flex flex-col space-y-8">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">
                    Compare
                  </h3>
                  <ul role="list" className="mt-4 space-y-4">
                    {navigation.compare.map((item) => (
                      <li key={item.name}>
                        <Link
                          href={createHref(item.href)}
                          {...(domain !== "dub.co" && {
                            onClick: () => {
                              va.track("Referred from custom domain", {
                                domain,
                                medium: `footer item (${item.name})`,
                              });
                            },
                          })}
                          className="text-sm text-gray-500 hover:text-gray-800"
                        >
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">Legal</h3>
                  <ul role="list" className="mt-4 space-y-4">
                    {navigation.legal.map((item) => (
                      <li key={item.name}>
                        <Link
                          href={createHref(item.href)}
                          {...(domain !== "dub.co" && {
                            onClick: () => {
                              va.track("Referred from custom domain", {
                                domain,
                                medium: `footer item (${item.name})`,
                              });
                            },
                          })}
                          className="text-sm text-gray-500 hover:text-gray-800"
                        >
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-semibold text-gray-800">Tools</h3>
                <ul role="list" className="mt-4 space-y-4">
                  {navigation.tools.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={createHref(item.href)}
                        {...(domain !== "dub.co" && {
                          onClick: () => {
                            va.track("Referred from custom domain", {
                              domain,
                              medium: `footer item (${item.name})`,
                            });
                          },
                        })}
                        className="text-sm text-gray-500 hover:text-gray-800"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
        <Image
          src="https://assets.dub.co/footer.png"
          alt="Dub Technologies, Inc. Logo"
          width={1959}
          height={625}
          className="pointer-events-none absolute inset-x-0 bottom-0 z-0"
        />
      </MaxWidthWrapper>
    </footer>
  );
}

function StatusBadge() {
  const { data } = useSWR<{
    ongoing_incidents: {
      name: string;
      current_worst_impact:
        | "degraded_performance"
        | "partial_outage"
        | "full_outage";
    }[];
  }>("https://status.dub.co/api/v1/summary", fetcher);

  const [color, setColor] = useState("bg-gray-200");
  const [status, setStatus] = useState("Loading status...");

  useEffect(() => {
    if (!data) return;
    const { ongoing_incidents } = data;
    if (ongoing_incidents.length > 0) {
      const { current_worst_impact, name } = ongoing_incidents[0];
      const color =
        current_worst_impact === "degraded_performance"
          ? "bg-yellow-500"
          : "bg-red-500";
      setStatus(name);
      setColor(color);
    } else {
      setStatus("All systems operational");
      setColor("bg-green-500");
    }
  }, [data]);

  return (
    <Link
      href="https://status.dub.co"
      target="_blank"
      className="group flex max-w-fit items-center space-x-2 rounded-md border border-gray-200 bg-white px-3 py-2 transition-colors hover:bg-gray-100"
    >
      <div className="relative h-3 w-3">
        <div
          className={cn(
            "absolute inset-0 m-auto h-3 w-3 animate-ping items-center justify-center rounded-full group-hover:animate-none",
            color,
            status === "Loading status..." && "animate-none",
          )}
        />
        <div
          className={cn(
            "absolute inset-0 z-10 m-auto h-3 w-3 rounded-full",
            color,
          )}
        />
      </div>
      <p className="text-sm font-medium text-gray-800">{status}</p>
    </Link>
  );
}
