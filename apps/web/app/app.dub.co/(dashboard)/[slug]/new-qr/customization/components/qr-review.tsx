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
      className="border-border-100 w-[204px] rounded-lg border bg-white p-[22px] [&_svg]:h-[160px] [&_svg]:w-[160px]"
    />
  );
};
