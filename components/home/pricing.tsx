import Link from "next/link";
import { CheckCircleFill } from "@/components/shared/icons";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import CountingNumbers from "@/components/shared/counting-numbers";

const pricingItems = [
  {
    plan: "Free",
    tagline: "For startups & side projects",
    price: 0,
    features: [
      "Free custom domains",
      "Unlimited links",
      "Up to 1K link clicks/month",
    ],
    cta: "Start for free",
    ctaLink: "https://app.dub.sh/register",
  },
  {
    plan: "Pro",
    tagline: "For larger teams with increased usage",
    isPopular: true,
    price: 99,
    features: [
      "Free custom domains",
      "Unlimited links",
      "Up to 1M link clicks/month",
    ],
    cta: "Get started",
    ctaLink: "https://app.dub.sh/register",
  },
  {
    plan: "Enterprise",
    tagline: "For businesses with custom needs",
    price: "Custom",
    features: [
      "Free custom domains",
      "Unlimited links",
      "Unlimited link clicks",
    ],
    cta: "Contact us",
    ctaLink: "mailto:steven@dub.sh?subject=Interested%20in%20Dub%20Enterprise",
  },
];

const Pricing = () => {
  return (
    <MaxWidthWrapper className="mt-20 mb-40 text-center">
      <div className="max-w-sm sm:max-w-md mx-auto my-10">
        <h2 className="text-4xl sm:text-5xl font-display font-extrabold text-black">
          Simple,{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">
            affordable
          </span>{" "}
          pricing
        </h2>
        <p className="text-gray-600 sm:text-lg mt-5">
          Start for free, no credit card required. Upgrade anytime.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {pricingItems.map(
          ({ plan, tagline, isPopular, price, features, cta, ctaLink }) => (
            <div
              key={plan}
              className={`relative bg-white rounded-2xl ${
                isPopular
                  ? "border-2 border-blue-600 shadow-blue-200"
                  : "border border-gray-200"
              } shadow-md`}
            >
              {isPopular && (
                <div className="absolute -top-5 left-0 right-0 mx-auto bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-sm font-medium w-32 px-3 py-2 rounded-full">
                  Popular
                </div>
              )}
              <div className="p-5">
                <h3 className="text-center text-3xl font-bold font-display my-3">
                  {plan}
                </h3>
                <p className="text-gray-500">{tagline}</p>
                {typeof price === "number" ? (
                  <div className="my-5 flex justify-center">
                    <p className="text-6xl font-display font-semibold">$</p>
                    <CountingNumbers
                      value={price}
                      reverse={true}
                      className="text-6xl font-display font-semibold"
                    />
                  </div>
                ) : (
                  <p className="my-5 text-6xl font-display font-semibold">
                    {price}
                  </p>
                )}
                <p className="text-gray-500">Monthly</p>
              </div>
              <div className="border-t border-gray-200" />
              <ul className="px-10 my-10 space-y-5">
                {features.map((feature) => (
                  <li key={feature} className="flex space-x-5">
                    <div className="flex-shrink-0">
                      <CheckCircleFill className="w-6 h-6 text-green-500" />
                    </div>
                    <p className="text-gray-600">{feature}</p>
                  </li>
                ))}
              </ul>
              <div className="border-t border-gray-200" />
              <div className="p-5">
                <Link href={ctaLink}>
                  <a
                    className={`${
                      isPopular
                        ? "bg-gradient-to-r from-blue-600 to-cyan-600 hover:bg-white text-white hover:text-transparent hover:bg-clip-text border border-transparent hover:border-blue-700"
                        : "bg-black text-white hover:bg-white hover:text-black border border-gray-200 hover:border-black"
                    } block w-full py-2 rounded-full font-medium transition-all`}
                  >
                    {cta}
                  </a>
                </Link>
              </div>
            </div>
          )
        )}
      </div>
    </MaxWidthWrapper>
  );
};

export default Pricing;
