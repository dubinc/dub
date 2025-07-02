function getStepClassName(isActive: boolean): string {
  return isActive ? "w-4 h-2 bg-neutral-400" : "size-2 bg-neutral-300";
}

export function StepProgressBar({ step }: { step: number }) {
  const totalSteps = 3;

  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const isActive = step === index + 1;

        return (
          <div
            key={index}
            className={`rounded-full ${getStepClassName(isActive)}`}
          />
        );
      })}
    </div>
  );
}
