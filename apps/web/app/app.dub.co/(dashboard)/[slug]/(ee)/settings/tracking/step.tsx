"use client";

import { PropsWithChildren } from "react";

import { Button, Check2, ChevronRight } from "@dub/ui";
import { cn, isClickOnInteractiveChild } from "@dub/utils";
import { AnimatePresence, motion } from "motion/react";
import { ReactNode } from "react";

export type Step = "connect" | "lead" | "sale";

export type BaseStepProps = {
  expanded?: boolean;
  toggleExpanded: () => void;
};

export type StepProps = BaseStepProps & {
  id: Step;
  step: number;
  title: string;
  subtitle?: string;
  complete?: boolean;
  children?: ReactNode;
  contentClassName?: string;
};

const Step = ({
  step,
  title,
  subtitle,
  complete,
  expanded,
  toggleExpanded,
  children,
  contentClassName,
}: PropsWithChildren<StepProps>) => {
  return (
    <div className="flex items-start gap-[22px] rounded-xl border border-neutral-200 bg-white p-5">
      <StepNumber number={step} complete={complete} />

      <div className="flex min-w-0 grow flex-col">
        <div
          className="group/step-header flex cursor-pointer items-center justify-between gap-2"
          onClick={(e) => {
            if (!isClickOnInteractiveChild(e)) toggleExpanded();
          }}
        >
          <div>
            <div className="text-content-emphasis text-base font-semibold">
              {title}
            </div>
            {subtitle && (
              <div className="text-content-subtle text-sm font-medium">
                {subtitle}
              </div>
            )}
          </div>

          <Button
            variant="plain"
            className="hover:bg-bg-subtle group-hover/step-header:bg-bg-subtle group size-8 w-fit rounded-full border-none px-2"
            data-state={expanded ? "open" : "closed"}
            text={
              <ChevronRight className="text-content-emphasis size-4 transition-transform duration-75 group-data-[state=open]:rotate-90" />
            }
            onClick={() => toggleExpanded()}
          />
        </div>

        <motion.div
          initial={false}
          animate={{ height: expanded ? "auto" : 0 }}
          className="overflow-hidden"
        >
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                className={cn(contentClassName, "pt-5")}
                key="step-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                {children}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

const StepNumber = ({
  number,
  complete,
}: {
  number: number;
  complete?: boolean;
}) => {
  return (
    <div
      className={cn(
        "hidden size-[42px] shrink-0 items-center justify-center rounded-full sm:flex",
        complete ? "bg-green-400" : "bg-neutral-100",
      )}
    >
      {complete ? (
        <Check2 className="size-4 text-green-800" />
      ) : (
        <span className="text-content-default text-base font-semibold">
          {number}
        </span>
      )}
    </div>
  );
};

export default Step;
