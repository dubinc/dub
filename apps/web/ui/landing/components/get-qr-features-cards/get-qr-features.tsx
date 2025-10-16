'use client'

import { SectionTitle } from "@/ui/landing/components/section-title.tsx";
import { Icon } from "@iconify/react";
import { FC } from "react";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from "@dub/utils";
import { motion } from "motion/react";
import { GET_QR_FEATURES } from "./config.ts";

export const GetQRFeaturesCardsSection: FC = () => {
  return (
    <section className='py-8 sm:py-16 lg:py-24'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        {/* Header */}
        <div className="mb-12 flex flex-col items-center justify-center gap-6 sm:mb-16 lg:mb-24 lg:gap-10">
          <SectionTitle
            titleFirstPart={"More Than Just a"}
            highlightedTitlePart={"QR Code"}
            titleSecondPart={"Generator"}
          />
        </div>

        <div className='grid gap-8 sm:grid-cols-2 lg:grid-cols-4'>
          {GET_QR_FEATURES.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -8, transition: { duration: 0.3, ease: "easeOut" } }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                duration: 0.5,
                delay: index * 0.1,
                ease: "easeOut"
              }}
              className="group relative"
            >
              {/* Animated gradient border */}
              <div
                className="absolute -inset-[2px] rounded-lg blur-sm transition-opacity duration-500 group-hover:opacity-60"
                style={{
                  background: `linear-gradient(90deg, ${feature.borderColor}, transparent, ${feature.borderColor})`,
                  backgroundSize: "200% 100%",
                  animation: "gradient-move 3s linear infinite",
                  opacity: 0.3
                }}
              />

              <Card
                className="relative h-full bg-white shadow-sm transition-all duration-300 group-hover:shadow-md"
                style={{ borderColor: feature.borderColor }}
              >
                <CardContent className="p-6">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.4,
                      delay: index * 0.1 + 0.2,
                      ease: "easeOut"
                    }}
                  >
                    <Avatar className={cn('mb-6 size-12 rounded-xl', feature.avatarTextColor)}>
                      <AvatarFallback className={cn('rounded-xl [&>svg]:size-7', feature.avatarBgColor)}>
                        <Icon icon={feature.icon} />
                      </AvatarFallback>
                    </Avatar>
                  </motion.div>

                  <h6 className='mb-3 text-lg font-semibold text-neutral'>{feature.title}</h6>
                  <p className='text-neutral-200 leading-relaxed'>{feature.content}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
