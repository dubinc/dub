"use client";

import Link from "next/link";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "#/ui/accordion";
import { AnimatePresence, motion } from "framer-motion";
import { FEATURES_LIST } from "#/lib/constants/content";
import BlurImage from "../blur-image";

export default function Features() {
  const [activeFeature, setActiveFeature] = useState(0);
  return (
    <div id="features">
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
                setActiveFeature(
                  FEATURES_LIST.findIndex(({ slug }) => slug === e),
                );
              }}
            >
              {FEATURES_LIST.map((feature) => (
                <AccordionItem key={feature.slug} value={feature.slug}>
                  <AccordionTrigger>
                    <div className="flex items-center space-x-3 p-3">
                      <feature.icon className="h-5 w-5 text-gray-500" />
                      <h3 className="text-base font-semibold text-gray-600">
                        {feature.accordionTitle}
                      </h3>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="p-3">
                      <p className="mb-4 text-sm text-gray-500">
                        {feature.description}
                      </p>
                      <Link
                        href={`/features/${feature.slug}`}
                        className="block max-w-fit rounded-full border border-black bg-black px-4 py-1.5 text-sm text-white transition-all hover:bg-white hover:text-black"
                      >
                        Learn more
                      </Link>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <div className="lg:col-span-2">
              <AnimatePresence mode="wait">
                {FEATURES_LIST.map((feature, index) => {
                  if (index === activeFeature) {
                    return (
                      <motion.div
                        key={feature.slug}
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
                        <BlurImage
                          src={feature.thumbnail}
                          alt={feature.title}
                          className="absolute inset-0 h-full w-full object-cover"
                          width={1735}
                          height={990}
                        />
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
