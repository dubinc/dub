"use client";

import { PropsWithChildren } from "react";

import { Button, Check2 } from "@dub/ui";
import { cn } from "@dub/utils";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ReactNode } from "react";

type Step = "connect" | "lead" | "sale";

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

      <div className="flex flex-1 flex-col gap-5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-content-emphasis text-base font-semibold">
              {title}
            </div>
            {subtitle && (
              <div className="test-sm text-content-subtle font-medium">
                {subtitle}
              </div>
            )}
          </div>

          <Button
            variant="plain"
            className="hover:bg-bg-subtle size-8 w-fit rounded-full border-none px-2"
            data-state={expanded ? "open" : "closed"}
            text={
              <ChevronDown className="text-content-emphasis size-4 transition-transform duration-75 data-[state=open]:rotate-180" />
            }
            onClick={() => toggleExpanded()}
          />
        </div>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              className={cn(contentClassName, "flex-1 overflow-y-scroll")}
              key="step-content"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
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
        "flex size-[42px] shrink-0 items-center justify-center rounded-full",
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
