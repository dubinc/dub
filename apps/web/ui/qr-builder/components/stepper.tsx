import { cn } from "@dub/utils/src";
import { CheckIcon } from "lucide-react";

type TStep = {
  number: number;
  label: string;
};

interface IStepperProps {
  steps: TStep[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export default function Stepper({ steps, currentStep, onStepClick }: IStepperProps) {
  return (
    <div className="flex w-full items-center justify-center md:w-3/4">
      {steps.map((step, index) => {
        const isCompleted = currentStep > step.number;
        const isActive = currentStep === step.number;
        const isLast = index === steps.length - 1;
        const isClickable = onStepClick && (isCompleted || step.number === currentStep + 1);

        return (
          <div
            key={step.number}
            className={cn("flex items-center", isLast ? "flex-0" : "flex-1")}
          >
            <div 
              className={cn(
                "flex flex-col items-center", 
                isClickable && "cursor-pointer"
              )}
              onClick={() => isClickable && onStepClick(step.number)}
            >
              <div className="relative flex h-6 w-6 items-center justify-center transition-all duration-300 ease-in-out">
                <div
                  className={cn("absolute inset-0 -m-[2px] rounded-full", {
                    "bg-[linear-gradient(90deg,_#115740_20.53%,_#25BD8B_37.79%)] p-[2px]":
                      isActive || isCompleted,
                    "border border-gray-300 bg-white":
                      !isActive && !isCompleted,
                  })}
                />

                <div
                  className={cn(
                    "relative z-10 flex h-full w-full items-center justify-center rounded-full text-sm font-medium",
                    {
                      "text-primary bg-primary-100": isCompleted,
                      "text-primary bg-white": isActive && !isCompleted,
                      "bg-white text-neutral-500": !isActive && !isCompleted,
                    },
                  )}
                >
                  {isCompleted ? (
                    <CheckIcon className="h-5 w-5" />
                  ) : (
                    step.number
                  )}
                </div>
              </div>

              <span
                className={cn(
                  "mt-1 whitespace-nowrap text-xs font-medium md:text-sm",
                  isCompleted || isActive ? "text-primary" : "text-neutral-500",
                )}
              >
                {step.label}
              </span>
            </div>

            {!isLast && (
              <div
                className={cn(
                  "mx-2 mb-6 h-0.5 min-w-6 flex-1 shrink-0 rounded-md",
                  isCompleted ? "bg-primary" : "bg-border-500",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
