"use client";

import { cn } from "@dub/utils";
import { Icon } from "@iconify/react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { QR_TYPES } from "../../../../(public)/landing/constants/get-qr-config.ts";
import { STEPS } from "../constants.ts";
import { usePageContext } from "../page-context.tsx";

export default function NewQRType() {
  const router = useRouter();
  const { slug } = useParams() as { slug?: string };
  const { setTitle, setCurrentStep } = usePageContext();
  const searchParams = useSearchParams();
  const selectedQRType = searchParams.get("type");

  useEffect(() => {
    setTitle(STEPS.newQR.title);
    setCurrentStep(STEPS.newQR.step);
  }, []);

  const handleSelect = (type: string) => {
    if (!slug) return;

    router.replace(`/${slug}/new-qr/content?type=${type}`);
  };

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {QR_TYPES.map((qr) => (
        <button
          key={qr.id}
          onClick={() => handleSelect(qr.id)}
          className={cn(
            "bg-primary-200 hover:bg-primary-300 flex h-[81px] w-full max-w-[171.5px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg px-[6px] py-3 transition focus:outline-none md:h-24 md:max-w-[242px] md:gap-3 md:px-2 lg:max-w-[272px]",
            selectedQRType === qr.id && "border-primary bg-primary-300 border",
          )}
        >
          <Icon icon={qr.icon} className="mb-2 text-2xl text-neutral-200" />
          <span className="text-neutral text-xs font-normal md:text-sm">
            {qr.label}
          </span>
        </button>
      ))}
    </div>
  );
}
