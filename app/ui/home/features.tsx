"use client";

import Link from "next/link";
import { Airplay, Chart, Users, Photo } from "@/components/shared/icons";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "#/ui/accordion";
import { AnimatePresence, motion } from "framer-motion";
import { useLinkQRModal } from "#/ui/modals/link-qr-modal";
import { APP_DOMAIN, DEFAULT_LINK_PROPS } from "#/lib/constants";
import { useAddEditLinkModal } from "#/ui/modals/add-edit-link-modal";
import { Link2, QrCode } from "lucide-react";

const featureList = [
  {
    key: "analytics",
    title: "Analytics that matter",
    icon: <Chart className="h-5 w-5 text-gray-600" />,
    description:
      "Dub provides powerful analytics for your links, including geolocation, device, browser, and referrer information.",
    cta: (
      <Link
        href="/stats/github"
        className="block max-w-fit rounded-full border border-black bg-black px-4 py-1.5 text-sm text-white transition-all hover:bg-white hover:text-black"
      >
        View demo
      </Link>
    ),
    demo: "https://d2vwwcvoksz7ty.cloudfront.net/analytics.mp4",
    thumbnail: "/_static/features/analytics.png",
  },
  {
    key: "domains",
    title: "Use your own domain",
    icon: <Airplay className="h-5 w-5 text-gray-600" />,
    description:
      "Dub offers free custom domains on all plans - start personalizing your links today.",
    cta: (
      <a
        href="/help/article/how-to-add-custom-domain"
        target="_blank"
        className="block max-w-fit rounded-full border border-black bg-black px-4 py-1.5 text-sm text-white transition-all hover:bg-white hover:text-black"
      >
        Learn more
      </a>
    ),
    demo: "https://d2vwwcvoksz7ty.cloudfront.net/custom-domain.mp4",
  },
  {
    key: "link",
    title: "Powerful link builder",
    icon: <Link2 className="h-5 w-5 text-gray-600" />,
    description:
      "Build your links with UTM parameters, password protection, expiration dates, iOS/Android targeting, etc.",
    cta: "View demo", //custom cta
    demo: "https://d2vwwcvoksz7ty.cloudfront.net/link.mp4",
  },
  {
    key: "social",
    title: "Custom social media cards",
    icon: <Photo className="h-5 w-5 text-gray-600" />,
    description:
      "Overlay custom OG images on your links to make them stand out on social media.",
    cta: (
      <a
        href="/help/article/how-to-create-link#custom-social-media-cards"
        target="_blank"
        className="block max-w-fit rounded-full border border-black bg-black px-4 py-1.5 text-sm text-white transition-all hover:bg-white hover:text-black"
      >
        Learn more
      </a>
    ),
    demo: "https://d2vwwcvoksz7ty.cloudfront.net/og.mp4",
  },
  {
    key: "qr",
    title: "Free QR code generator",
    icon: <QrCode className="h-5 w-5 text-gray-600" />,
    description:
      "QR codes and short links are like peas in a pod. That's why we've built a QR code generator right into Dub.",
    cta: "View demo", //custom cta
    demo: "https://d2vwwcvoksz7ty.cloudfront.net/qr.mp4",
  },
  {
    key: "team",
    title: "Collaborate with your team",
    icon: <Users className="h-5 w-5 text-gray-600" />,
    description:
      "With Dub, you can invite your teammates to collaborate on your project for free - no more sharing logins via Google groups.",
    cta: (
      <a
        href="/help/article/how-to-invite-teammates"
        target="_blank"
        className="block max-w-fit rounded-full border border-black bg-black px-4 py-1.5 text-sm text-white transition-all hover:bg-white hover:text-black"
      >
        Learn more
      </a>
    ),
    demo: "https://d2vwwcvoksz7ty.cloudfront.net/team.mp4",
  },
];

export default function Features() {
  const [activeFeature, setActiveFeature] = useState(0);

  const { setShowAddEditLinkModal, AddEditLinkModal } = useAddEditLinkModal({
    props: DEFAULT_LINK_PROPS,
    homepageDemo: true,
  });
  const { setShowLinkQRModal, LinkQRModal } = useLinkQRModal({
    props: {
      key: "github",
      url: "https://github.com/steven-tey/dub",
    },
  });
  return (
    <div id="features">
      <AddEditLinkModal />
      <LinkQRModal />
      {featureList.map(({ key, demo }) => (
        // preload videos
        <link key={key} rel="preload" as="video" href={demo} />
      ))}
      <MaxWidthWrapper className="pb-10 pt-24">
        <div className="mx-auto max-w-md text-center sm:max-w-xl">
          <h2 className="font-display text-4xl font-extrabold leading-tight text-black sm:text-5xl sm:leading-tight">
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Powerful
            </span>{" "}
            features for{" "}
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              modern
            </span>{" "}
            marketing teams
          </h2>
          <p className="mt-5 text-gray-600 sm:text-lg">
            Dub is more than just a link shortener. We've built a suite of
            powerful features that gives you marketing superpowers.
          </p>
        </div>

        <div className="my-10 h-[840px] w-full overflow-hidden rounded-xl border border-gray-200 bg-white/10 shadow-[inset_10px_-50px_94px_0_rgb(199,199,199,0.2)] backdrop-blur lg:h-[630px]">
          <div className="grid grid-cols-1 gap-10 p-5 lg:grid-cols-3">
            <Accordion
              type="single"
              defaultValue="analytics"
              onValueChange={(e) => {
                setActiveFeature(featureList.findIndex(({ key }) => key === e));
              }}
            >
              {featureList.map(({ key, title, icon, description, cta }) => (
                <AccordionItem key={key} value={key}>
                  <AccordionTrigger>
                    <div className="flex items-center space-x-3 p-3">
                      {icon}
                      <h3 className="text-base font-semibold text-gray-600">
                        {title}
                      </h3>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="p-3">
                      <p className="mb-4 text-sm text-gray-500">
                        {description}
                      </p>
                      {key === "link" ? (
                        <button
                          onClick={() => setShowAddEditLinkModal(true)}
                          className="block max-w-fit rounded-full border border-black bg-black px-4 py-1.5 text-sm text-white transition-all hover:bg-white hover:text-black"
                        >
                          View demo
                        </button>
                      ) : key === "qr" ? (
                        <button
                          onClick={() => setShowLinkQRModal(true)}
                          className="block max-w-fit rounded-full border border-black bg-black px-4 py-1.5 text-sm text-white transition-all hover:bg-white hover:text-black"
                        >
                          View demo
                        </button>
                      ) : (
                        cta
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <div className="lg:col-span-2">
              <AnimatePresence mode="wait">
                {featureList.map((feature, index) => {
                  if (index === activeFeature) {
                    return (
                      <motion.div
                        key={feature.title}
                        initial={{
                          y: 10,
                          opacity: 0,
                        }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{
                          y: -10,
                          opacity: 0,
                        }}
                        transition={{
                          duration: 0.15,
                          stiffness: 300,
                          damping: 30,
                        }}
                        className="relative min-h-[600px] w-full overflow-hidden whitespace-nowrap rounded-2xl bg-white shadow-2xl lg:mt-10 lg:w-[800px]"
                      >
                        <video
                          autoPlay
                          muted
                          loop
                          width={800}
                          height={600}
                          poster={feature.thumbnail}
                        >
                          <source src={feature.demo} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>
                      </motion.div>
                    );
                  }
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </MaxWidthWrapper>
    </div>
  );
}
