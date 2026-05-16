import { PARTNER_PLATFORM_FIELDS } from "@/lib/partners/partner-platforms";
import { PartnerPlatformProps } from "@/lib/types";
import { useCurrentSubdomain } from "@dub/ui";
import { cn } from "@dub/utils";
import { Fragment, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { PartnerPlatformCard } from "./partner-platform-card";

export function PartnerPlatformSummary({
  platforms,
  partnerId,
  className,
}: {
  platforms: PartnerPlatformProps[] | undefined;
  partnerId: string;
  className?: string;
}) {
  const { subdomain } = useCurrentSubdomain();
  const { mutate } = useSWRConfig();
  const [verifyingPlatforms, setVerifyingPlatforms] = useState<
    Partial<Record<PartnerPlatformProps["type"], boolean>>
  >({});

  if (!platforms || platforms.length === 0) {
    return (
      <div className={cn("text-sm italic text-neutral-400", className)}>
        No platforms connected
      </div>
    );
  }

  const fieldByType = useMemo(
    () =>
      ({
        website: PARTNER_PLATFORM_FIELDS[0],
        youtube: PARTNER_PLATFORM_FIELDS[1],
        twitter: PARTNER_PLATFORM_FIELDS[2],
        linkedin: PARTNER_PLATFORM_FIELDS[3],
        instagram: PARTNER_PLATFORM_FIELDS[4],
        tiktok: PARTNER_PLATFORM_FIELDS[5],
      }) as Record<
        PartnerPlatformProps["type"],
        (typeof PARTNER_PLATFORM_FIELDS)[number]
      >,
    [],
  );

  const fieldData = (Object.keys(fieldByType) as PartnerPlatformProps["type"][])
    .map((type) => {
      const field = fieldByType[type];
      const platform = platforms.find((p) => p.type === type);
      const data = field.data(platforms);
      return {
        type,
        label: field.label,
        icon: field.icon,
        identifier: platform?.identifier ?? null,
        ...data,
      };
    })
    .filter((field) => field.value && field.href && field.identifier);

  const handleVerifyPlatform = async (
    platform: PartnerPlatformProps["type"],
    identifier: string,
    label: string,
  ) => {
    if (subdomain !== "admin") {
      return;
    }

    setVerifyingPlatforms((prev) => ({ ...prev, [platform]: true }));

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
      setVerifyingPlatforms((prev) => ({ ...prev, [platform]: false }));
    }
  };

  return (
    <div
      className={cn(
        "grid grid-cols-1 items-center gap-x-4 gap-y-5 text-sm md:gap-x-16",
        className,
      )}
    >
      {fieldData.map(
        ({
          type,
          label,
          icon: Icon,
          value,
          verified,
          href,
          info,
          identifier,
        }) => {
          return (
            <Fragment key={label}>
              <div>
                <PartnerPlatformCard
                  icon={Icon}
                  value={value ?? ""}
                  verified={verified}
                  info={info}
                  href={href ?? undefined}
                  {...(subdomain === "admin" && {
                    onVerify: () =>
                      handleVerifyPlatform(type, identifier as string, label),
                    isVerifying: Boolean(verifyingPlatforms[type]),
                  })}
                />
              </div>
            </Fragment>
          );
        },
      )}
    </div>
  );
}
