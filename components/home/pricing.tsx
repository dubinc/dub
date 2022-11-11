import Link from "next/link";
import { useMemo, useState } from "react";
import Confetti from "react-dom-confetti";
import {
  CheckCircleFill,
  QuestionCircle,
  XCircleFill,
} from "@/components/shared/icons";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import Slider from "@/components/shared/slider";
import Switch from "@/components/shared/switch";
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
      { text: "Password-protected links" },
      { text: "Custom Social Previews", footnote: <OGImageProxy /> },
      {
        text: "Root domain redirect",
        footnote:
          "Redirect vistors that land on the root of your domain (e.g. yourdomain.com) to a page of your choice.",
        negative: true,
      },
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
      { text: "Password-protected links" },
      { text: "Custom Social Previews", footnote: <OGImageProxy /> },
      {
        text: "Root domain redirect",
        footnote:
          "Redirect vistors that land on the root of your domain (e.g. yourdomain.com) to a page of your choice.",
      },
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
      { text: "Password-protected links" },
      { text: "Custom Social Previews", footnote: <OGImageProxy /> },
      {
        text: "Root domain redirect",
        footnote:
          "Redirect vistors that land on the root of your domain (e.g. yourdomain.com) to a page of your choice.",
      },
      { text: "SSO/SAML" },
    ],
    cta: "Contact us",
    ctaLink: "mailto:steven@dub.sh?subject=Interested%20in%20Dub%20Enterprise",
  },
];

const Pricing = () => {
  const [tier, setTier] = useState(0);
  const [annualBilling, setAnnualBilling] = useState(false);
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
            usage-based
          </span>{" "}
          pricing
        </h2>
        <p className="mt-5 text-gray-600 sm:text-lg">
          Start for free, no credit card required. Upgrade anytime.
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
          trackDimensions="h-6 w-12"
          thumbDimensions="h-5 w-5"
          thumbTranslate="translate-x-6"
          checked={false}
        />
        <p className="text-gray-600">Billed Annually</p>
        <span className="absolute -top-8 -right-12 rounded-full bg-purple-200 px-3 py-1 text-sm text-purple-700 sm:-right-[9.5rem] sm:-top-2">
          🎁 2 months FREE
        </span>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        {pricingItems.map(
          ({ plan, tagline, clicksLimit, features, cta, ctaLink }) => (
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
                {plan === "Enterprise" ? (
                  <p className="my-5 font-display text-6xl font-semibold">
                    Custom
                  </p>
                ) : (
                  <div className="my-5 flex justify-center">
                    <p className="font-display text-6xl font-semibold">
                      $
                      {plan === "Pro"
                        ? period === "yearly"
                          ? nFormatter(
                              PRO_TIERS[tier].price.yearly.amount / 12,
                              1,
                            )
                          : PRO_TIERS[tier].price.monthly.amount
                        : 0}
                    </p>
                  </div>
                )}
                <p className="text-gray-500">
                  per {period === "yearly" ? "month, billed annually" : "month"}
                </p>
              </div>
              <div className="flex h-20 items-center justify-center border-t border-b border-gray-200 bg-gray-50">
                {plan === "Pro" ? (
                  <div className="flex flex-col items-center space-y-1">
                    <Slider
                      value={tier}
                      setValue={setTier}
                      maxValue={PRO_TIERS.length - 1}
                    />
                    <div className="flex items-center">
                      <p className="text-sm text-gray-600">
                        Up to {nFormatter(PRO_TIERS[tier].quota)} link clicks/mo
                      </p>
                      <Tooltip content="If you exceed your monthly usage, your existing links will still work, but you need to upgrade to view their stats/add more links. Link clicks are shared across all projects.">
                        <div className="flex h-4 w-6 justify-center">
                          <QuestionCircle className="h-4 w-4 text-gray-600" />
                        </div>
                      </Tooltip>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <p className="text-gray-600">{clicksLimit}</p>
                    <Tooltip content="If you exceed your monthly usage, your existing links will still work, but you need to upgrade to view their stats/add more links. Link clicks are shared across all projects.">
                      <div className="flex h-4 w-8 justify-center">
                        <QuestionCircle className="h-4 w-4 text-gray-600" />
                      </div>
                    </Tooltip>
                  </div>
                )}
              </div>
              <ul className="my-10 space-y-5 px-10">
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
                  href={ctaLink}
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
          ),
        )}
      </div>
    </MaxWidthWrapper>
  );
};

export default Pricing;
