"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Confetti from "react-dom-confetti";
import {
  CheckCircleFill,
  QuestionCircle,
  XCircleFill,
} from "@/components/shared/icons";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import Switch from "#/ui/switch";
import Tooltip from "#/ui/tooltip";
import { PLANS } from "@/lib/stripe/constants";
import { nFormatter } from "@/lib/utils";

const pricingItems = [
  {
    plan: "Free",
    tagline: "For startups & side projects",
    quota: 1000,
    features: [
      { text: "Unlimited users" },
      { text: "Unlimited branded links" },
      {
        text: "Unlimited custom domains",
      },
      {
        text: "Free SSL certificates",
      },
      {
        text: "Advanced link features",
        footnote:
          "Password protection, link expiration, device targeting, custom social media cards, etc.",
      },
      {
        text: "Root domain redirect",
        footnote:
          "Redirect vistors that land on the root of your domain (e.g. yourdomain.com) to a page of your choice.",
        negative: true,
      },
      {
        text: "Custom QR Code Logo",
        negative: true,
      },
      { text: "SSO/SAML", negative: true },
      { text: "Priority support", negative: true },
    ],
    cta: "Start for free",
  },
  {
    plan: "Pro",
    tagline: "For larger teams with increased usage",
    quota: PLANS.find((p) => p.slug === "pro")!.quota,
    features: [
      { text: "Unlimited users" },
      { text: "Unlimited branded links" },
      {
        text: "Unlimited custom domains",
      },
      {
        text: "Free SSL certificates",
      },
      {
        text: "Advanced link features",
        footnote:
          "Password protection, link expiration, device targeting, custom social media cards, etc.",
      },
      {
        text: "Root domain redirect",
        footnote:
          "Redirect visitors that land on the root of your domain (e.g. yourdomain.com) to a page of your choice.",
      },
      {
        text: "Custom QR Code Logo",
      },
      { text: "SSO/SAML", negative: true },
      { text: "Priority support", negative: true },
    ],
    cta: "Get started",
  },
  {
    plan: "Enterprise",
    tagline: "For businesses with custom needs",
    quota: PLANS.find((p) => p.slug === "enterprise")!.quota,
    features: [
      { text: "Unlimited users" },
      { text: "Unlimited branded links" },
      {
        text: "Unlimited custom domains",
      },
      {
        text: "Free SSL certificates",
      },
      {
        text: "Advanced link features",
        footnote:
          "Password protection, link expiration, device targeting, custom social media cards, etc.",
      },
      {
        text: "Root domain redirect",
        footnote:
          "Redirect visitors that land on the root of your domain (e.g. yourdomain.com) to a page of your choice.",
      },
      {
        text: "Custom QR Code Logo",
      },
      { text: "SSO/SAML", footnote: "Under development. ETA: Q4 2023" },
      {
        text: "Priority support",
        footnote: "Email & chat support within 24 hours.",
      },
    ],
    cta: "Get started",
  },
];

const Pricing = ({ homePage }: { homePage?: boolean }) => {
  const [annualBilling, setAnnualBilling] = useState(homePage ? false : true);
  const period = useMemo(
    () => (annualBilling ? "yearly" : "monthly"),
    [annualBilling],
  );

  return (
    <MaxWidthWrapper className="my-20 text-center">
      <div id="pricing" className="mx-auto my-10 sm:max-w-lg">
        <h2 className="font-display text-4xl font-extrabold text-black sm:text-5xl">
          Simple,{" "}
          <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            affordable
          </span>{" "}
          pricing.
        </h2>
        <p className="mt-5 text-gray-600 sm:text-lg">
          Shorten your links without breaking your bank. <br />
          Start for free, no credit card required.
        </p>
      </div>

      <div className="relative mx-auto mb-14 flex max-w-fit items-center space-x-2">
        <p className="text-gray-600">Billed Monthly</p>
        <Confetti
          active={period === "yearly"}
          config={{ elementCount: 200, spread: 90 }}
        />
        <Switch
          fn={setAnnualBilling}
          checked={annualBilling}
          trackDimensions="h-6 w-12"
          thumbDimensions="h-5 w-5"
          thumbTranslate="translate-x-6"
        />
        <p className="text-gray-600">Billed Annually</p>
        <span className="absolute -right-12 -top-8 rounded-full bg-purple-200 px-3 py-1 text-sm text-purple-700 sm:-right-[9.5rem] sm:-top-2">
          🎁 2 months FREE
        </span>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        {pricingItems.map(({ plan, tagline, quota, features, cta }) => {
          const price =
            PLANS.find((p) => p.slug === plan.toLowerCase())?.price[period]
              .amount || 0;
          return (
            <div
              key={plan}
              className={`relative rounded-2xl bg-white ${
                plan === "Pro"
                  ? "border-2 border-blue-600 shadow-blue-200"
                  : "border border-gray-200"
              } shadow-lg`}
            >
              {plan === "Pro" && (
                <div className="absolute -top-5 left-0 right-0 mx-auto w-32 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 px-3 py-2 text-sm font-medium text-white">
                  Popular
                </div>
              )}

              <div className="p-5">
                <h3 className="my-3 text-center font-display text-3xl font-bold">
                  {plan}
                </h3>
                <p className="text-gray-500">{tagline}</p>
                <p className="my-5 font-display text-6xl font-semibold">
                  ${period === "yearly" ? nFormatter(price / 12, 1) : price}
                </p>
                <p className="text-gray-500">
                  per {period === "yearly" ? "month, billed annually" : "month"}
                </p>
              </div>
              <div className="flex h-20 items-center justify-center border-b border-t border-gray-200 bg-gray-50">
                <div className="flex items-center">
                  <p className="text-gray-600">
                    Up to {nFormatter(quota)} link clicks/mo
                  </p>
                  <Tooltip content="If you exceed your monthly usage, your existing links will still work, but you need to upgrade to view their stats/add more links. Link clicks are shared across all projects.">
                    <div className="flex h-4 w-8 justify-center">
                      <QuestionCircle className="h-4 w-4 text-gray-600" />
                    </div>
                  </Tooltip>
                </div>
              </div>
              <ul className="my-10 space-y-5 px-8">
                {features.map(({ text, footnote, negative }) => (
                  <li key={text} className="flex space-x-5">
                    <div className="flex-shrink-0">
                      {negative ? (
                        <XCircleFill className="h-6 w-6 text-gray-300" />
                      ) : (
                        <CheckCircleFill className="h-6 w-6 text-green-500" />
                      )}
                    </div>
                    {footnote ? (
                      <div className="flex items-center">
                        <p
                          className={
                            negative ? "text-gray-400" : "text-gray-600"
                          }
                        >
                          {text}
                        </p>
                        <Tooltip content={footnote}>
                          <div className="flex h-4 w-8 justify-center">
                            <QuestionCircle className="h-4 w-4 text-gray-600" />
                          </div>
                        </Tooltip>
                      </div>
                    ) : (
                      <p
                        className={negative ? "text-gray-400" : "text-gray-600"}
                      >
                        {text}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              <div className="border-t border-gray-200" />
              <div className="p-5">
                <Link
                  href="https://app.dub.sh/register"
                  className={`${
                    plan === "Pro"
                      ? "border border-transparent bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:border-blue-700 hover:bg-white hover:bg-clip-text hover:text-transparent"
                      : "border border-gray-200 bg-black text-white hover:border-black hover:bg-white hover:text-black"
                  } block w-full rounded-full py-2 font-medium transition-all`}
                >
                  {cta}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </MaxWidthWrapper>
  );
};

export default Pricing;
