"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { SectionTitle } from "@/ui/landing/components/section-title.tsx";
import { cn } from "@dub/utils";
import { Calendar, CheckIcon, Star, TrendingUp, Zap } from "lucide-react";
import { motion } from "motion/react";
import { FC } from "react";
import { PRICING_PLANS } from "./config.ts";

interface IPricingSectionProps {
  handleScrollButtonClick: (type: "1" | "2" | "3") => void;
}

const planIcons = [
  <Zap key="zap" />,
  <TrendingUp key="trending" />,
  <Calendar key="calendar" />,
  <Star key="star" />,
];

const extractPrice = (planText: string): number => {
  const match = planText.match(/\$(\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : 0;
};

export const PricingSection: FC<IPricingSectionProps> = ({
  handleScrollButtonClick,
}) => {
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 sm:py-16 lg:px-8 lg:py-24">
      <div className="mb-12 flex flex-col items-center justify-center gap-6 lg:mb-24 lg:gap-10">
        <SectionTitle
          titleFirstPart={"Start 7-Day Trial Today, Upgrade when"}
          highlightedTitlePart={"You Need"}
          className="lg:!leading-[52px]"
        />
      </div>

      <div className="relative grid items-end gap-6 lg:grid-cols-4">
        {PRICING_PLANS.map((plan, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{
              duration: 0.5,
              delay: index * 0.1,
              ease: "easeOut",
            }}
            whileHover={{
              y: -8,
              transition: { duration: 0.3, ease: "easeOut" },
            }}
            className="h-full"
          >
            <Card
              className={cn(
                "sm:max-lg:w-lg relative h-full w-full overflow-hidden pt-3 sm:max-lg:mx-auto",
                {
                  "border-primary border-2 shadow-lg": plan.withButton,
                },
              )}
            >
              <motion.div
                className="bg-muted absolute -right-6 -top-6 z-0 rounded-full p-10 [&>svg]:size-12 [&>svg]:flex-shrink-0 [&>svg]:stroke-1 [&>svg]:opacity-20"
                initial={{ scale: 0, rotate: -180 }}
                whileInView={{ scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.1 + 0.2,
                  ease: "easeOut",
                }}
              >
                {planIcons[index]}
              </motion.div>
              <CardContent className="relative z-10 flex h-full flex-col gap-6">
                <div>
                  <div className="mb-4">
                    <h3 className="text-card-foreground text-2xl font-semibold">
                      {plan.title}
                    </h3>
                  </div>

                  <div className="mb-2 flex items-end gap-1">
                    <span className="text-muted-foreground text-lg">$</span>
                    <NumberTicker
                      value={extractPrice(plan.plan)}
                      className="text-card-foreground text-5xl font-bold leading-none"
                      decimalPlaces={2}
                    />
                    <span className="text-muted-foreground pb-1 text-lg">
                      /{plan.plan.split("/")[1]}
                    </span>
                  </div>
                  <Badge className="bg-primary/20 text-primary border-primary/30 mt-3 inline-block w-fit rounded-full border px-3 py-1 text-xs font-semibold">
                    {plan.badge}
                  </Badge>
                </div>

                <div className="flex-grow space-y-3">
                  <h4 className="text-card-foreground mb-5 text-lg font-semibold">
                    What's included:
                  </h4>
                  {plan.planFeatures.map((feature, featureIndex) => (
                    <motion.div
                      key={featureIndex}
                      className="flex items-center gap-3"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{
                        duration: 0.4,
                        delay: index * 0.1 + featureIndex * 0.1 + 0.3,
                        ease: "easeOut",
                      }}
                    >
                      <CheckIcon className="text-muted-foreground h-5 w-5 flex-shrink-0" />
                      <span className="text-card-foreground font-medium">
                        {feature}
                      </span>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  className="mt-auto"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 + 0.4 }}
                >
                  {plan.withButton ? (
                    <Button
                      className="bg-secondary hover:bg-secondary/90 hidden sm:inline-flex w-full"
                      size="lg"
                      onClick={() => handleScrollButtonClick("3")}
                    >
                      Start Trial
                    </Button>
                  ) : (
                    <div className="h-10" />
                  )}
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
