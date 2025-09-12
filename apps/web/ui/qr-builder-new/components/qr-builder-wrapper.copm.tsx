import { QRBuilderInner } from "./qr-builder-inner.component";
import { QRBuilderSteps } from "./qr-builder-steps.component";

export const QRBuilderWrapper = () => {
  return (
    <div className="border-border-500 mx-auto flex h-full w-full flex-col justify-between rounded-lg border bg-white">
      <QRBuilderSteps />
      <div className="border-t-border-500 flex w-full flex-col items-stretch justify-between gap-4 border-t p-6 md:gap-6">
        <QRBuilderInner />
      </div>
    </div>
  );
};
