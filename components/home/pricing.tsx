import Link from "next/link";
import { useState } from "react";
import {
  CheckCircleFill,
  QuestionCircle,
  XCircleFill,
} from "@/components/shared/icons";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import Slider from "@/components/shared/slider";
import Tooltip, { OGImageProxy } from "@/components/shared/tooltip";
import { PRO_TIERS } from "@/lib/stripe/constants";
import { nFormatter } from "@/lib/utils";

const pricingItems = [
  {
    plan: "Free",
    tagline: "For startups & side projects",
    clicksLimit: "Up to 1K link clicks/mo",
    features: [
      {
        text: "Free custom domains",
        footnote:
          "Just bring any domain you own and turn it into a custom domain link shortener for free.",
      },
      { text: "Unlimited branded links" },
      { text: "5 projects" },
      {
        text: "Root domain redirect",
        footnote:
          "Redirect vistors that land on the root of your domain (e.g. yourdomain.com) to a page of your choice.",
        negative: true,
      },
      { text: "Password-protected links", negative: true },
      { text: "OG Image Proxy", footnote: <OGImageProxy />, negative: true },
      { text: "SSO/SAML", negative: true },
    ],
    cta: "Start for free",
    ctaLink: "https://app.dub.sh/register",
  },
  {
    plan: "Pro",
    tagline: "For larger teams with increased usage",
    features: [
      {
        text: "Free custom domains",
        footnote:
          "Just bring any domain you own and turn it into a custom domain link shortener for free.",
      },
      { text: "Unlimited branded links" },
      { text: "Unlimited projects" },
      {
        text: "Root domain redirect",
        footnote:
          "Redirect vistors that land on the root of your domain (e.g. yourdomain.com) to a page of your choice.",
      },
      { text: "Password-protected links" },
      { text: "OG Image Proxy", footnote: <OGImageProxy /> },
      { text: "SSO/SAML", negative: true },
    ],
    cta: "Get started",
    ctaLink: "https://app.dub.sh/register",
  },
  {
    plan: "Enterprise",
    tagline: "For businesses with custom needs",
    clicksLimit: "Unlimited link clicks",
    features: [
      {
        text: "Free custom domains",
        footnote:
          "Just bring any domain you own and turn it into a custom domain link shortener for free.",
      },
      { text: "Unlimited branded links" },
      { text: "Unlimited projects" },
      {
        text: "Root domain redirect",
        footnote:
          "Redirect vistors that land on the root of your domain (e.g. yourdomain.com) to a page of your choice.",
      },
      { text: "Password-protected links" },
      { text: "OG Image Proxy", footnote: <OGImageProxy /> },
      { text: "SSO/SAML" },
    ],
    cta: "Contact us",
    ctaLink: "mailto:steven@dub.sh?subject=Interested%20in%20Dub%20Enterprise",
  },
];

const Pricing = () => {
  const [tier, setTier] = useState(0);

  return (
    <MaxWidthWrapper className="mt-20 mb-40 text-center">
      <div id="pricing" className="sm:max-w-lg mx-auto my-10">
        <h2 className="text-4xl sm:text-5xl font-display font-extrabold text-black">
          Simple,{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">
            usage-based
          </span>{" "}
          pricing
        </h2>
        <p className="text-gray-600 sm:text-lg mt-5">
          Start for free, no credit card required. Upgrade anytime.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {pricingItems.map(
          ({ plan, tagline, clicksLimit, features, cta, ctaLink }) => (
            <div
              key={plan}
              className={`relative bg-white rounded-2xl ${
                plan === "Pro"
                  ? "border-2 border-blue-600 shadow-blue-200"
                  : "border border-gray-200"
              } shadow-md`}
            >
              {plan === "Pro" && (
                <div className="absolute -top-5 left-0 right-0 mx-auto bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-medium w-32 px-3 py-2 rounded-full">
                  Popular
                </div>
              )}
              <div className="p-5">
                <h3 className="text-center text-3xl font-bold font-display my-3">
                  {plan}
                </h3>
                <p className="text-gray-500">{tagline}</p>
                {plan === "Enterprise" ? (
                  <p className="my-5 text-6xl font-display font-semibold">
                    Custom
                  </p>
                ) : (
                  <div className="my-5 flex justify-center">
                    <p className="text-6xl font-display font-semibold">
                      $
                      {plan === "Pro"
                        ? PRO_TIERS[tier].price.monthly.amount
                        : 0}
                    </p>
                  </div>
                )}
                <p className="text-gray-500">Monthly</p>
              </div>
              <div className="border-t border-b border-gray-200 flex items-center justify-center h-20 bg-gray-50">
                {plan === "Pro" ? (
                  <div className="flex flex-col space-y-1 items-center">
                    <Slider
                      value={tier}
                      setValue={setTier}
                      maxValue={PRO_TIERS.length - 1}
                    />
                    <div className="flex items-center">
                      <p className="text-gray-600 text-sm">
                        Up to {nFormatter(PRO_TIERS[tier].quota)} link clicks/mo
                      </p>
                      <Tooltip content="If you exceed your monthly usage, your existing links will still work, but you need to upgrade to view their stats/add more links. Link clicks are shared across all projects.">
                        <div className="flex justify-center w-6 h-4">
                          <QuestionCircle className="w-4 h-4 text-gray-600" />
                        </div>
                      </Tooltip>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <p className="text-gray-600">{clicksLimit}</p>
                    <Tooltip content="If you exceed your monthly usage, your existing links will still work, but you need to upgrade to view their stats/add more links. Link clicks are shared across all projects.">
                      <div className="flex justify-center w-8 h-4">
                        <QuestionCircle className="w-4 h-4 text-gray-600" />
                      </div>
                    </Tooltip>
                  </div>
                )}
              </div>
              <ul className="px-10 my-10 space-y-5">
                {features.map(({ text, footnote, negative }) => (
                  <li key={text} className="flex space-x-5">
                    <div className="flex-shrink-0">
                      {negative ? (
                        <XCircleFill className="w-6 h-6 text-gray-300" />
                      ) : (
                        <CheckCircleFill className="w-6 h-6 text-green-500" />
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
                          <div className="flex justify-center w-8 h-4">
                            <QuestionCircle className="w-4 h-4 text-gray-600" />
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
                <Link href={ctaLink}>
                  <a
                    className={`${
                      plan === "Pro"
                        ? "bg-gradient-to-r from-blue-600 to-cyan-600 hover:bg-white text-white hover:text-transparent hover:bg-clip-text border border-transparent hover:border-blue-700"
                        : "bg-black text-white hover:bg-white hover:text-black border border-gray-200 hover:border-black"
                    } block w-full py-2 rounded-full font-medium transition-all`}
                  >
                    {cta}
                  </a>
                </Link>
              </div>
            </div>
          ),
        )}
      </div>
    </MaxWidthWrapper>
  );
};

export default Pricing;
