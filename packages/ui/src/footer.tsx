"use client";

import { ALL_TOOLS, cn, createHref, fetcher } from "@dub/utils";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { COMPARE_PAGES, FEATURES_LIST, LEGAL_PAGES } from "./content";
import { Github, LinkedIn, Twitter, YouTube } from "./icons";
import { MaxWidthWrapper } from "./max-width-wrapper";
import { NavWordmark } from "./nav-wordmark";

const socials = [
  {
    name: "Twitter",
    icon: Twitter,
    href: "https://twitter.com/dubdotco",
  },
  {
    name: "LinkedIn",
    icon: LinkedIn,
    href: "https://www.linkedin.com/company/dubinc",
  },
  {
    name: "GitHub",
    icon: Github,
    href: "https://github.com/dubinc/dub",
  },
  {
    name: "YouTube",
    icon: YouTube,
    href: "https://www.youtube.com/@dubdotco",
  },
];

const navigation = {
  features: FEATURES_LIST.map(({ title, href }) => ({
    name: title,
    href,
  })),
  product: [
    { name: "Blog", href: "/blog" },
    { name: "Changelog", href: "/changelog" },
    { name: "Customers", href: "/customers" },
    { name: "Enterprise", href: "/enterprise" },
    { name: "Pricing", href: "/pricing" },
    { name: "Docs", href: "/docs" },
    { name: "Help Center", href: "/help" },
    { name: "Brand", href: "/brand" },
  ],
  compare: COMPARE_PAGES.map(({ name, slug }) => ({
    name,
    href: `/compare/${slug}`,
  })),
  legal: LEGAL_PAGES.map(({ name, slug }) => ({
    name,
    href: `/legal/${slug}`,
  })),
  tools: ALL_TOOLS.map(({ name, slug }) => ({
    name,
    href: `/tools/${slug}`,
  })),
};

const linkListHeaderClassName = "text-sm font-medium text-neutral-900";
const linkListClassName = "flex flex-col mt-2.5 gap-2.5";
const linkListItemClassName =
  "text-sm text-neutral-400 hover:text-neutral-600 transition-colors duration-75";

export function Footer({
  staticDomain,
  className,
}: {
  staticDomain?: string;
  className?: string;
}) {
  let { domain = "dub.co" } = useParams() as { domain: string };
  if (staticDomain) {
    domain = staticDomain;
  }

  return (
    <MaxWidthWrapper
      className={cn(
        "relative z-10 overflow-hidden border border-b-0 border-neutral-200 bg-white/50 py-16 backdrop-blur-lg md:rounded-t-2xl",
        className,
      )}
    >
      <footer>
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="flex flex-col gap-6">
            <div className="grow">
              <Link
                href={createHref("/", domain, {
                  utm_source: "Custom Domain",
                  utm_medium: "Footer",
                  utm_campaign: domain,
                  utm_content: "Logo",
                })}
                className="block max-w-fit"
              >
                <span className="sr-only">
                  {process.env.NEXT_PUBLIC_APP_NAME} Logo
                </span>
                <NavWordmark className="h-8 text-gray-800" />
              </Link>
            </div>
            <div className="flex items-center gap-3">
              {socials.map(({ name, icon: Icon, href }) => (
                <a
                  key={name}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="group rounded-full p-1"
                >
                  <span className="sr-only">{name}</span>
                  <Icon className="size-4 text-neutral-900 transition-colors duration-75 group-hover:text-neutral-600" />
                </a>
              ))}
            </div>
          </div>
          <div className="mt-16 grid grid-cols-2 gap-4 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2">
              <div>
                <h3 className={linkListHeaderClassName}>Product</h3>
                <ul role="list" className={linkListClassName}>
                  {navigation.features.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={createHref(item.href, domain, {
                          utm_source: "Custom Domain",
                          utm_medium: "Footer",
                          utm_campaign: domain,
                          utm_content: item.name,
                        })}
                        className={linkListItemClassName}
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className={linkListHeaderClassName}>Resources</h3>
                <ul role="list" className={linkListClassName}>
                  {navigation.product.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={createHref(item.href, domain, {
                          utm_source: "Custom Domain",
                          utm_medium: "Footer",
                          utm_campaign: domain,
                          utm_content: item.name,
                        })}
                        className={linkListItemClassName}
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
                  <h3 className={linkListHeaderClassName}>Compare</h3>
                  <ul role="list" className={linkListClassName}>
                    {navigation.compare.map((item) => (
                      <li key={item.name}>
                        <Link
                          href={createHref(item.href, domain, {
                            utm_source: "Custom Domain",
                            utm_medium: "Footer",
                            utm_campaign: domain,
                            utm_content: item.name,
                          })}
                          className={linkListItemClassName}
                        >
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className={linkListHeaderClassName}>Legal</h3>
                  <ul role="list" className={linkListClassName}>
                    {navigation.legal.map((item) => (
                      <li key={item.name}>
                        <Link
                          href={createHref(item.href, domain, {
                            utm_source: "Custom Domain",
                            utm_medium: "Footer",
                            utm_campaign: domain,
                            utm_content: item.name,
                          })}
                          className={linkListItemClassName}
                        >
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-10 md:mt-0">
                <h3 className={linkListHeaderClassName}>Tools</h3>
                <ul role="list" className={linkListClassName}>
                  {navigation.tools.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={createHref(item.href, domain, {
                          utm_source: "Custom Domain",
                          utm_medium: "Footer",
                          utm_campaign: domain,
                          utm_content: item.name,
                        })}
                        className={linkListItemClassName}
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

        {/* Bottom row (status, SOC2, copyright) */}
        <div className="mt-12 grid grid-cols-1 items-center gap-8 sm:grid-cols-3">
          <StatusBadge />
          <Link
            href={createHref("/blog/soc2", domain, {
              utm_source: "Custom Domain",
              utm_medium: "Footer",
              utm_campaign: domain,
              utm_content: "SOC2",
            })}
            className="flex sm:justify-center"
          >
            <Image
              src="https://assets.dub.co/misc/soc2.svg"
              alt="AICPA SOC 2 Type II Certified"
              width={63}
              height={32}
              className="h-8 transition-[filter] duration-75 hover:brightness-90"
            />
          </Link>
          <p className="text-xs text-neutral-400 sm:text-right">
            © {new Date().getFullYear()} Dub Technologies, Inc.
          </p>
        </div>
      </footer>
    </MaxWidthWrapper>
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

  const [color, setColor] = useState("bg-neutral-200");
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
      className="group flex max-w-fit items-center gap-2 rounded-lg border border-neutral-200 bg-white py-2 pl-2 pr-2.5 transition-colors hover:bg-neutral-50 active:bg-neutral-100"
    >
      <div className="relative size-2">
        <div
          className={cn(
            "absolute inset-0 m-auto size-2 animate-ping items-center justify-center rounded-full group-hover:animate-none",
            color,
            status === "Loading status..." && "animate-none",
          )}
        />
        <div
          className={cn(
            "absolute inset-0 z-10 m-auto size-2 rounded-full",
            color,
          )}
        />
      </div>
      <p className="text-xs font-medium leading-none text-neutral-600">
        {status}
      </p>
    </Link>
  );
}
