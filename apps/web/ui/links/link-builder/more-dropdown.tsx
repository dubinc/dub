import useWorkspace from "@/lib/swr/use-workspace";
import { useABTestingModal } from "@/ui/modals/link-builder/ab-testing-modal";
import { useAdvancedModal } from "@/ui/modals/link-builder/advanced-modal";
import { useExpirationModal } from "@/ui/modals/link-builder/expiration-modal";
import { usePasswordModal } from "@/ui/modals/link-builder/password-modal";
import { useTargetingModal } from "@/ui/modals/link-builder/targeting-modal";
import { useWebhooksModal } from "@/ui/modals/link-builder/webhooks-modal";
import { ProBadgeTooltip } from "@/ui/shared/pro-badge-tooltip";
import { Button, Popover, SimpleTooltipContent, useMediaQuery } from "@dub/ui";
import { Dots } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import { MOBILE_MORE_ITEMS, MORE_ITEMS } from "./constants";
import { LinkFormData } from "./link-builder-provider";
import { useLinkBuilderKeyboardShortcut } from "./use-link-builder-keyboard-shortcut";

export function MoreDropdown() {
  const { flags } = useWorkspace();
  const { isMobile } = useMediaQuery();

  const { watch, setValue } = useFormContext<LinkFormData>();
  const data = watch();

  const [openPopover, setOpenPopover] = useState(false);

  const options = useMemo(() => {
    return [...(isMobile ? MOBILE_MORE_ITEMS : []), ...MORE_ITEMS].filter(
      (option) => (option.key === "testVariants" ? flags?.abTesting : true),
    );
  }, [data, isMobile, flags]);

  const { ABTestingModal, setShowABTestingModal } = useABTestingModal();
  const { PasswordModal, setShowPasswordModal } = usePasswordModal();
  const { TargetingModal, setShowTargetingModal } = useTargetingModal();
  const { ExpirationModal, setShowExpirationModal } = useExpirationModal();
  const { WebhooksModal, setShowWebhooksModal } = useWebhooksModal();
  const { AdvancedModal, setShowAdvancedModal } = useAdvancedModal();

  const modalCallbacks = {
    testVariants: setShowABTestingModal,
    password: setShowPasswordModal,
    targeting: setShowTargetingModal,
    expiresAt: setShowExpirationModal,
    webhookIds: setShowWebhooksModal,
    advanced: setShowAdvancedModal,
  };

  useLinkBuilderKeyboardShortcut(
    options.map(({ shortcutKey }) => shortcutKey),
    (e) => {
      const option = options.find(({ shortcutKey }) => shortcutKey === e.key);
      if (!option) return;

      setOpenPopover(false);
      if (option.type === "modal") modalCallbacks[option.key]?.(true);
      else
        setValue(option.key as any, !data[option.key], { shouldDirty: true });
    },
    { modal: true, priority: 1 },
  );

  return (
    <>
      <ABTestingModal />
      <PasswordModal />
      <TargetingModal />
      <ExpirationModal />
      <WebhooksModal />
      <AdvancedModal />
      <Popover
        align="start"
        content={
          <div className="grid p-1 max-sm:w-full md:min-w-72">
            {options.map((option) => {
              const enabled =
                "enabled" in option && typeof option.enabled === "function"
                  ? option.enabled(data)
                  : data[option.key];

              return (
                <Button
                  type="button"
                  variant="outline"
                  key={option.key}
                  onClick={() => {
                    setOpenPopover(false);

                    if (option.type === "modal") {
                      modalCallbacks[option.key]?.(true);
                    } else
                      setValue(option.key as any, !enabled, {
                        shouldDirty: true,
                      });
                  }}
                  className="h-9 w-full justify-start px-2 text-sm text-neutral-700"
                  textWrapperClassName="grow"
                  text={
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <option.icon
                          className={cn(
                            "mr-1 size-4 text-neutral-950",
                            enabled && "text-blue-500",
                          )}
                        />
                        {option.badgeLabel?.(data) ?? (
                          <>
                            {option.type === "modal"
                              ? enabled ||
                                ("add" in option && option.add === false)
                                ? ""
                                : "Add "
                              : enabled
                                ? "Remove "
                                : "Add "}
                            {option.label}
                          </>
                        )}
                        {option.description && option.learnMoreUrl && (
                          <ProBadgeTooltip
                            content={
                              <SimpleTooltipContent
                                title={option.description}
                                cta="Learn more."
                                href={option.learnMoreUrl}
                              />
                            }
                          />
                        )}
                      </div>
                      <kbd className="hidden size-6 cursor-default items-center justify-center rounded-md border border-neutral-200 font-sans text-xs text-neutral-800 sm:flex">
                        {option.shortcutKey.toUpperCase()}
                      </kbd>
                    </div>
                  }
                />
              );
            })}
          </div>
        }
        openPopover={openPopover}
        setOpenPopover={setOpenPopover}
      >
        <Button
          variant="secondary"
          icon={<Dots className="size-4" />}
          className="h-8 w-fit px-2"
        />
      </Popover>
    </>
  );
}
