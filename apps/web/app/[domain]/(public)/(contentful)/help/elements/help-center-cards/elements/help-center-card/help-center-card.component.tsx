"use client";

import { Icon } from "@iconify/react";

import { motion } from "framer-motion";

import { cn } from "@dub/utils/src";
import { Button } from "@radix-ui/themes";
import Link from "next/link";
import { Dispatch, FC, SetStateAction } from "react";
import { ISection } from "../../../../types";

export interface IHelpCenterCardComponentProps {
  section: ISection;
  className?: string;
  index: number;
  setIsVisibleAll: Dispatch<SetStateAction<boolean>>;
  isVisibleAll: boolean;
}

export const HelpCenterCardComponent: FC<
  Readonly<IHelpCenterCardComponentProps>
> = ({ section, className, index, setIsVisibleAll, isVisibleAll }) => {
  const subsections = section?.pages;

  return (
    <div
      id="card"
      className={cn(
        "w-full rounded-2xl border border-[#E2E8F0] p-5 shadow-none",
        className,
      )}
    >
      <div
        id="header"
        className="p-0 text-xl font-semibold leading-relaxed text-slate-800"
      >
        {section.title}
      </div>
      <div
        id="card-body"
        className={cn("mt-4 p-0", {
          "grid md:grid-cols-2 md:gap-x-16": index === 0,
        })}
      >
        {subsections?.map((subsection, idx) => {
          const isVisible = isVisibleAll || idx < 5 || index === 0;

          return (
            <motion.div
              key={subsection.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{
                opacity: isVisible ? 1 : 0,
                y: isVisible ? 0 : -10,
                height: isVisible ? "auto" : 0,
                overflow: "hidden",
              }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <Link
                className="flex items-start justify-between gap-2 py-1.5 leading-7 text-slate-700 hover:underline"
                href={
                  subsection?.link ? subsection.link : `help/${subsection.slug}`
                }
              >
                {subsection.title}
                <div className="pt-1.5">
                  <Icon icon="tabler:chevron-right" width={16} />
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
      <div
        id="card-footer"
        className={cn("p-0 pt-6", {
          hidden: index === 0 || subsections?.length < 6,
        })}
      >
        <p className="pl-0.5 text-sm font-medium text-slate-600">
          {subsections?.length} articles
        </p>
        <Button
          onClick={() => {
            setIsVisibleAll((prev) => !prev);
          }}
          className={cn(
            "ml-auto h-fit min-w-16 bg-white !px-0 font-semibold text-slate-800 hover:!bg-transparent",
            {
              hidden: index === 0 || subsections?.length < 6,
            },
          )}
        >
          {isVisibleAll ? "Hide" : "View all"}
        </Button>
      </div>
    </div>
  );
};
