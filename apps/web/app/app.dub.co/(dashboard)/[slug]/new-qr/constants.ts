import FirstStep from "@/ui/shared/icons/qr-creation-steps/first-step.tsx";
import SecondStep from "@/ui/shared/icons/qr-creation-steps/second-step.tsx";
import ThirdStep from "@/ui/shared/icons/qr-creation-steps/third-step.tsx";

export const STEPS = {
  newQR: { title: "New QR", step: 1, href: "new-qr/type", icon: FirstStep },
  content: {
    title: "Content",
    step: 2,
    href: "new-qr/content",
    icon: SecondStep,
  },
  customization: {
    title: "Customization",
    step: 3,
    href: "new-qr/customization",
    icon: ThirdStep,
  },
} as const;
