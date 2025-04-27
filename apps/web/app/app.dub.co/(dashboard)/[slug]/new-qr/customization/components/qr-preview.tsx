import QRCodeStyling from "qr-code-styling";
import { useEffect, useRef } from "react";

export const QRPreview = ({ qrCode }: { qrCode: QRCodeStyling | null }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!qrCode || !ref.current) return;

    qrCode.append(ref.current);

    return () => {
      ref.current?.replaceChildren();
    };
  }, [qrCode]);

  return (
    <div
      ref={ref}
      className="border-border-100 flex h-[160px] w-[160px] items-center justify-center rounded-lg border bg-white p-[11px] md:h-[204px] md:w-[204px] md:p-[22px] [&_svg]:h-[150px] [&_svg]:w-[150px] md:[&_svg]:h-[160px] md:[&_svg]:w-[160px]"
    />
  );
};
