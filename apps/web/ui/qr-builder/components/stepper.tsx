import { cn } from "@dub/utils/src";
import { CheckIcon } from "lucide-react";

type TStep = {
  number: number;
  label: string;
};

interface IStepperProps {
  steps: TStep[];
  currentStep: number;
}

export default function Stepper({ steps, currentStep }: IStepperProps) {
  return (
    <div className="flex w-[70%] items-center justify-start">
      {steps.map((step, index) => {
        const isCompleted = currentStep > step.number;
        const isActive = currentStep === step.number;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.number} className="flex flex-1 items-center">
            <div className="flex flex-col items-center">
              {/*<div*/}
              {/*  className={cn(*/}
              {/*    "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-medium",*/}
              {/*    isCompleted*/}
              {/*      ? "border-primary text-primary bg-green-50"*/}
              {/*      : isActive*/}
              {/*        ? "border-primary text-primary"*/}
              {/*        : "border-gray-300 text-gray-500",*/}
              {/*  )}*/}
              {/*>*/}
              {/*  {isCompleted ? <CheckIcon className="h-5 w-5" /> : step.number}*/}
              {/*</div>*/}
              {/*<div className="relative flex h-[25px] w-[25px] items-center justify-center">*/}
              {/*  <div*/}
              {/*    className="absolute inset-0 -m-[2px] rounded-full"*/}
              {/*    style={{*/}
              {/*      background:*/}
              {/*        "linear-gradient(90deg, #115740 20.53%, #25BD8B 37.79%)",*/}
              {/*      padding: "2px",*/}
              {/*    }}*/}
              {/*  >*/}
              {/*    <div*/}
              {/*      className={cn(*/}
              {/*        "flex h-full w-full items-center justify-center rounded-full text-sm font-medium",*/}
              {/*        isCompleted*/}
              {/*          ? "text-primary bg-primary-100"*/}
              {/*          : isActive*/}
              {/*            ? "text-primary bg-white"*/}
              {/*            : "bg-white text-neutral-500",*/}
              {/*      )}*/}
              {/*    >*/}
              {/*      {isCompleted ? (*/}
              {/*        <CheckIcon className="h-5 w-5" />*/}
              {/*      ) : (*/}
              {/*        step.number*/}
              {/*      )}*/}
              {/*    </div>*/}
              {/*  </div>*/}
              {/*</div>*/}
              <div className="relative flex h-6 w-6 items-center justify-center transition-all duration-300 ease-in-out">
                <div
                  className={cn("absolute inset-0 -m-[2px] rounded-full", {
                    // Use gradient only when active or completed
                    "bg-[linear-gradient(90deg,_#115740_20.53%,_#25BD8B_37.79%)] p-[2px]":
                      isActive || isCompleted,
                    // Fallback gray border
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
                  "mt-1 text-sm font-medium",
                  isCompleted || isActive ? "text-primary" : "text-neutral-500",
                )}
              >
                {step.label}
              </span>
            </div>

            {!isLast && (
              <div
                className={cn(
                  "mx-2 mb-6 h-0.5 flex-1 rounded-md",
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
