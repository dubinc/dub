"use client";

import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import {
  OnlinePresenceForm,
  useOnlinePresenceForm,
} from "@/ui/partners/online-presence-form";
import { Button, DotsPattern, LoadingSpinner } from "@dub/ui";
import { useRef } from "react";
import { toast } from "sonner";

export function ProfileSocialPageClient() {
  const { partner, error } = usePartnerProfile();

  const form = useOnlinePresenceForm({ partner });
  const formRef = useRef<HTMLFormElement>(null);
  const {
    formState: { isSubmitting },
  } = form;

  return (
    <PageContent
      title="Website and socials"
      titleInfo={{
        title:
          "Build a stronger partner profile and increase trust by adding and verifying your website and social accounts.",
        href: "https://dub.co/help/article/partner-profile-sites",
      }}
      controls={
        <Button
          text="Save changes"
          className="h-8 w-fit px-2.5"
          loading={isSubmitting}
          onClick={() => formRef.current?.requestSubmit()}
        />
      }
    >
      <PageWidthWrapper className="flex flex-col gap-8">
        <div className="relative m-1 mb-8">
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl bg-neutral-100/50 [mask-image:linear-gradient(black,transparent_60%)]"
            aria-hidden
          >
            <div className="absolute inset-4 overflow-hidden">
              <div className="absolute inset-y-0 left-1/2 w-[1200px] -translate-x-1/2">
                <DotsPattern className="text-neutral-200/80" />
              </div>
            </div>
          </div>
          <div className="relative mx-auto my-12 w-full max-w-[400px]">
            {partner ? (
              <OnlinePresenceForm
                ref={formRef}
                form={form}
                partner={partner}
                variant="settings"
                onSubmitSuccessful={() => {
                  toast.success("Online presence updated successfully.");
                }}
              />
            ) : (
              <div className="flex h-32 w-full items-center justify-center">
                {error ? (
                  <span className="text-sm text-neutral-500">
                    Failed to load online presence data
                  </span>
                ) : (
                  <LoadingSpinner />
                )}
              </div>
            )}
          </div>
        </div>
      </PageWidthWrapper>
    </PageContent>
  );
}
