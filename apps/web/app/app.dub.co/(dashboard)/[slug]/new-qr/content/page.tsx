"use client";

import { QRCodeContentBuilder } from "@/ui/shared/qr-code-content-builder.tsx";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { EQRType } from "../../../../(public)/landing/constants/get-qr-config.ts";
import { STEPS } from "../constants.ts";
import { usePageContext } from "../page-context.tsx";

export default function NewQRContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { slug } = useParams() as { slug?: string };
  const qrType = searchParams.get("type") as EQRType;
  const { setTitle, setCurrentStep } = usePageContext();

  useEffect(() => {
    setTitle("Complete content of the QR");
    setCurrentStep(STEPS.content.step);
  }, [setTitle, setCurrentStep]);

  const handleValidNext = () => {
    if (slug && qrType) {
      router.replace(
        `/${slug}/new-qr/customization?type=${qrType}&content=true`,
      );
    }
  };

  return (
    <QRCodeContentBuilder qrType={qrType} handleContent={handleValidNext} />
  );
}
