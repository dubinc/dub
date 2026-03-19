import { verifySocialAccountByCodeAction } from "@/lib/actions/partners/verify-social-account-by-code";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { PlatformType } from "@dub/prisma/client";
import { Button, buttonVariants, CopyButton, Modal } from "@dub/ui";
import { cn } from "@dub/utils";
import { X } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { Dispatch, ReactNode, SetStateAction, useState } from "react";
import { toast } from "sonner";

interface SocialVerificationByCodeModalProps {
  showSocialVerificationModal: boolean;
  setShowSocialVerificationModal: Dispatch<SetStateAction<boolean>>;
  platform: PlatformType;
  handle: string;
  verificationCode: string;
}

interface PlatformInfo {
  name: string;
  title: string;
  instruction: string;
  openLabel: string;
  verifyTitle: string;
  verifyDescription: string;
  getProfileUrl: (handle: string, verificationCode: string) => string;
}

const PLATFORM_INFO: Record<
  "youtube" | "instagram" | "linkedin",
  PlatformInfo
> = {
  youtube: {
    name: "YouTube",
    title: "Edit your YouTube channel",
    instruction:
      "Navigate to your channel settings and add the 6 digit code above to your channel description temporarily.",
    openLabel: "Open channel",
    verifyTitle: "Verify account",
    verifyDescription:
      "Click verify below once you've added the code to your channel description.",
    getProfileUrl: (handle) => `https://www.youtube.com/@${handle}/about`,
  },
  instagram: {
    name: "Instagram",
    title: "Edit your Instagram profile",
    instruction:
      "Navigate to your profile settings and add the 6 digit code above to your bio temporarily.",
    openLabel: "Open profile",
    verifyTitle: "Verify account",
    verifyDescription:
      "Click verify below once you've added the code to your bio.",
    getProfileUrl: (handle) => `https://www.instagram.com/${handle}/`,
  },
  linkedin: {
    name: "LinkedIn",
    title: "Create a LinkedIn post",
    instruction:
      "Click the button below to create a LinkedIn post with the code pre-filled. You can remove the post after verification.",
    openLabel: "Create post on LinkedIn",
    verifyTitle: "Paste post URL and verify account",
    verifyDescription:
      "After creating the post, paste the post URL below and click verify.",
    getProfileUrl: (_handle, code) =>
      `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(code)}`,
  },
};

export function SocialVerificationByCodeModal(
  props: SocialVerificationByCodeModalProps,
) {
  return (
    <Modal
      showModal={props.showSocialVerificationModal}
      setShowModal={props.setShowSocialVerificationModal}
    >
      <SocialVerificationByCodeModalInner {...props} />
    </Modal>
  );
}

function SocialVerificationByCodeModalInner({
  setShowSocialVerificationModal,
  platform,
  handle,
  verificationCode,
}: SocialVerificationByCodeModalProps) {
  const { mutate: mutatePartner } = usePartnerProfile();
  const [postUrl, setPostUrl] = useState("");

  const platformInfo: PlatformInfo = PLATFORM_INFO[platform];
  const isLinkedIn = platform === "linkedin";

  const { executeAsync, isPending } = useAction(
    verifySocialAccountByCodeAction,
    {
      onSuccess: async () => {
        toast.success(`${platformInfo.name} account verified successfully!`);
        setShowSocialVerificationModal(false);
        await mutatePartner();
      },
      onError: ({ error }) => {
        toast.error(
          error.serverError || "Failed to verify account. Please try again.",
        );
      },
    },
  );

  const handleVerify = async () => {
    if (isLinkedIn && !postUrl) {
      toast.error("Please enter the LinkedIn post URL.");
      return;
    }

    await executeAsync({
      platform,
      handle,
      ...(isLinkedIn && { postUrl }),
    });
  };

  let stepNumber = 1;

  if (!platformInfo) {
    return null;
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-neutral-200 p-4 sm:px-6">
        <h3 className="text-lg font-semibold leading-none">
          Verify {platformInfo.name} account
        </h3>
        <button
          type="button"
          onClick={() => setShowSocialVerificationModal(false)}
          className="group rounded-full p-2 text-neutral-500 transition-all duration-75 hover:bg-neutral-100 focus:outline-none active:bg-neutral-200"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-col gap-4 bg-neutral-50 p-4 sm:p-6">
        <Step
          stepNumber={stepNumber++}
          title="Copy the code below"
          description="You'll use this to verify ownership of your account."
        >
          <div className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-neutral-100 px-4 py-2.5">
            <span className="text-content-default font-mono text-base font-medium tracking-wide">
              {verificationCode}
            </span>
            <CopyButton value={verificationCode} />
          </div>
        </Step>

        <Step
          stepNumber={stepNumber++}
          title={platformInfo.title}
          description={platformInfo.instruction}
        >
          <a
            href={platformInfo.getProfileUrl(handle, verificationCode)}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "flex h-8 w-full items-center justify-center rounded-md border px-3 text-sm",
            )}
          >
            {platformInfo.openLabel}
          </a>
        </Step>

        <Step
          stepNumber={stepNumber++}
          title={platformInfo.verifyTitle}
          description={platformInfo.verifyDescription}
        >
          {isLinkedIn && (
            <input
              type="url"
              value={postUrl}
              onChange={(e) => setPostUrl(e.target.value)}
              placeholder="https://www.linkedin.com/posts/..."
              className="block w-full rounded-md border border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
            />
          )}
          <Button
            text="Verify account"
            className="h-8 w-full px-3"
            loading={isPending}
            disabled={isLinkedIn && !postUrl}
            onClick={handleVerify}
          />
        </Step>
      </div>
    </>
  );
}

function Step({
  stepNumber,
  title,
  description,
  children,
}: {
  stepNumber: number;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-4">
      <div className="text-content-default flex size-6 items-center justify-center rounded-md border border-neutral-200 bg-white p-2 text-sm font-semibold">
        {stepNumber}
      </div>
      <div className="space-y-1">
        <h4 className="text-sm font-medium text-black">{title}</h4>
        <p className="text-content-default text-sm font-normal">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}
