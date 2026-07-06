import { getPartnerPlatformDisplay } from "@/lib/partners/partner-platforms";
import { PLATFORM_ORDER } from "@/lib/social-utils";
import { PartnerPlatformProps, PartnerSharedPlatformProps } from "@/lib/types";
import { AnimatedSizeContainer, useCurrentSubdomain } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { PlatformType } from "@prisma/client";
import { Fragment, useState } from "react";
import { toast } from "sonner";
import useSWR, { useSWRConfig } from "swr";
import { PartnerPlatformCard } from "./partner-platform-card";
import { PartnerPlatformSharedPartners } from "./partner-platform-shared-partners";

export function PartnerPlatformSummary({
  platforms,
  partnerId,
}: {
  platforms: PartnerPlatformProps[] | undefined;
  partnerId: string;
}) {
  const { subdomain } = useCurrentSubdomain();
  const { mutate } = useSWRConfig();

  const { data: sharedPlatforms } = useSWR<PartnerSharedPlatformProps[]>(
    subdomain === "admin" && partnerId
      ? `/api/admin/partners/${partnerId}/shared-platforms`
      : null,
    fetcher,
  );

  const [verifyingPlatforms, setVerifyingPlatforms] = useState<
    Record<string, boolean>
  >({});

  if (!platforms || platforms.length === 0) {
    return (
      <div className="gap-y-2 text-sm italic text-neutral-400">
        No platforms connected
      </div>
    );
  }

  // One entry per handle, grouped by platform type in display order
  const platformRows = [...platforms]
    .sort(
      (a, b) => PLATFORM_ORDER.indexOf(a.type) - PLATFORM_ORDER.indexOf(b.type),
    )
    .map((platform) => ({
      platform,
      ...getPartnerPlatformDisplay(platform),
    }))
    .filter((row) => row.value && row.href && row.platform.identifier);

  const handleVerifyPlatform = async (
    platform: PlatformType,
    identifier: string,
    label: string,
  ) => {
    if (subdomain !== "admin") {
      return;
    }

    const verifyingKey = `${platform}:${identifier}`;

    setVerifyingPlatforms((prev) => ({ ...prev, [verifyingKey]: true }));

    try {
      const response = await fetch(
        `/api/admin/partners/${partnerId}/platforms`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform, identifier }),
        },
      );

      if (!response.ok) {
        throw new Error(
          (await response.text()) || "Failed to verify platform.",
        );
      }

      await mutate(
        (key) =>
          typeof key === "string" &&
          key.startsWith("/api/admin/partners/network"),
      );
      toast.success(`${label} verified manually.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to verify platform.",
      );
    } finally {
      setVerifyingPlatforms((prev) => ({ ...prev, [verifyingKey]: false }));
    }
  };

  return (
    <div className="grid grid-cols-1 items-center gap-x-4 gap-y-2 text-sm md:gap-x-16">
      {platformRows.map(
        ({ platform, label, icon: Icon, value, verified, href, info }) => {
          const sharedPlatform = sharedPlatforms?.find(
            (shared) =>
              shared.type === platform.type &&
              shared.identifier === platform.identifier,
          );

          return (
            <Fragment key={`${platform.type}:${platform.identifier}`}>
              <div>
                <PartnerPlatformCard
                  icon={Icon}
                  value={value ?? ""}
                  verified={verified}
                  info={info}
                  href={href ?? undefined}
                  {...(subdomain === "admin" && {
                    onVerify: () =>
                      handleVerifyPlatform(
                        platform.type,
                        platform.identifier,
                        label,
                      ),
                    isVerifying: Boolean(
                      verifyingPlatforms[
                        `${platform.type}:${platform.identifier}`
                      ],
                    ),
                  })}
                />

                <AnimatedSizeContainer height>
                  {sharedPlatform && (
                    <PartnerPlatformSharedPartners
                      sharedPartners={sharedPlatform.partners}
                    />
                  )}
                </AnimatedSizeContainer>
              </div>
            </Fragment>
          );
        },
      )}
    </div>
  );
}
