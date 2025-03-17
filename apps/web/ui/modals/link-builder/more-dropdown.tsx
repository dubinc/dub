import { ProBadgeTooltip } from "@/ui/shared/pro-badge-tooltip";
import {
  Button,
  Popover,
  SimpleTooltipContent,
  useKeyboardShortcut,
  useMediaQuery,
} from "@dub/ui";
import { Dots } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import { LinkFormData } from ".";
import { useABTestingModal } from "./ab-testing-modal";
import { useAdvancedModal } from "./advanced-modal";
import { MOBILE_MORE_ITEMS, MORE_ITEMS } from "./constants";
import { useExpirationModal } from "./expiration-modal";
import { usePasswordModal } from "./password-modal";
import { useTargetingModal } from "./targeting-modal";

export function MoreDropdown() {
  const { isMobile } = useMediaQuery();

  const { watch, setValue } = useFormContext<LinkFormData>();
  const data = watch();

  const [openPopover, setOpenPopover] = useState(false);

  const options = useMemo(() => {
    return [...(isMobile ? MOBILE_MORE_ITEMS : []), ...MORE_ITEMS];
  }, [data, isMobile]);

  const { PasswordModal, setShowPasswordModal } = usePasswordModal();
  const { TargetingModal, setShowTargetingModal } = useTargetingModal();
  const { ExpirationModal, setShowExpirationModal } = useExpirationModal();
  const { AdvancedModal, setShowAdvancedModal } = useAdvancedModal();
  const { ABTestingModal, setShowABTestingModal } = useABTestingModal();

  const modalCallbacks = {
    password: setShowPasswordModal,
    targeting: setShowTargetingModal,
    expiresAt: setShowExpirationModal,
    tests: setShowABTestingModal,
    advanced: setShowAdvancedModal,
  };

  useKeyboardShortcut(
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
      <PasswordModal />
      <TargetingModal />
      <ExpirationModal />
      <AdvancedModal />
      <ABTestingModal />
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
                        {option.type === "modal"
                          ? enabled || ("add" in option && option.add === false)
                            ? ""
                            : "Add "
                          : enabled
                            ? "Remove "
                            : "Add "}
                        {option.label}
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
          className="h-9 w-fit px-2.5"
        />
      </Popover>
    </>
  );
}
