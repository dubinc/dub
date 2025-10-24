import { QRBuilderInner } from "@/ui/qr-builder-new/components/qr-builder-inner.tsx";
import { useQrBuilderContext } from "@/ui/qr-builder-new/context";
import { cn } from "@dub/utils/src";
import { motion } from "framer-motion";

export const QRBuilderWrapper = () => {
  const {
    builderStep,
    isTypeStep,
    qrBuilderContentWrapperRef,
  } = useQrBuilderContext();

  return (
    <motion.div
      ref={qrBuilderContentWrapperRef}
      key={`builder-step-${builderStep}`}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1],
      }}
      className={cn(
        "mx-auto flex h-full w-full flex-col justify-between",
        !isTypeStep &&
          "border-border-500 rounded-[20px] border bg-white shadow-lg",
      )}
    >
      <div>
        <div
          className={cn(
            "flex w-full flex-col items-stretch justify-between gap-4 p-6 md:gap-6",
          )}
        >
          <QRBuilderInner />
        </div>
      </div>
    </motion.div>
  );
};
