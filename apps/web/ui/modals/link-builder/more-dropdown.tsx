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
import { Settings } from "lucide-react";
import { useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import { LinkFormData } from ".";
import { useAdvancedModal } from "./advanced-modal";
import { MOBILE_MORE_ITEMS, TOGGLES } from "./constants";
import { useExpirationModal } from "./expiration-modal";
import { usePasswordModal } from "./password-modal";
import { useTargetingModal } from "./targeting-modal";

export function MoreDropdown() {
  const { isMobile } = useMediaQuery();

  const { watch, setValue } = useFormContext<LinkFormData>();
  const data = watch();

  const [openPopover, setOpenPopover] = useState(false);

  const options = useMemo(() => {
    return [...(isMobile ? MOBILE_MORE_ITEMS : []), ...TOGGLES];
  }, [data, isMobile]);

  useKeyboardShortcut(
    options.map(({ shortcutKey }) => shortcutKey),
    (e) => {
      const option = options.find(({ shortcutKey }) => shortcutKey === e.key);
      if (!option) return;

      setOpenPopover(false);
      setValue(option.key as any, !data[option.key], { shouldDirty: true });
    },
    { modal: true },
  );

  const { PasswordModal, setShowPasswordModal } = usePasswordModal();
  const { TargetingModal, setShowTargetingModal } = useTargetingModal();
  const { ExpirationModal, setShowExpirationModal } = useExpirationModal();
  const { AdvancedModal, setShowAdvancedModal } = useAdvancedModal();

  return (
    <>
      <PasswordModal />
      <TargetingModal />
      <ExpirationModal />
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
                      ({
                        password: setShowPasswordModal,
                        targeting: setShowTargetingModal,
                        expiresAt: setShowExpirationModal,
                      })[option.key]?.(true);
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
                        <option.icon className="mr-1 size-4 text-neutral-950" />
                        {option.type === "modal"
                          ? enabled
                            ? ""
                            : "Add "
                          : enabled
                            ? "Remove "
                            : "Add "}
                        {option.label}
                        <ProBadgeTooltip
                          content={
                            <SimpleTooltipContent
                              title={option.description}
                              cta="Learn more."
                              href={option.learnMoreUrl}
                            />
                          }
                        />
                      </div>
                      <kbd className="hidden size-6 cursor-default items-center justify-center rounded-md border border-neutral-200 font-sans text-xs text-neutral-800 sm:flex">
                        {option.shortcutKey.toUpperCase()}
                      </kbd>
                    </div>
                  }
                />
              );
            })}

            <Button
              variant="outline"
              className="h-9 justify-start px-2 text-sm text-neutral-700"
              textWrapperClassName="grow"
              onClick={() => {
                setOpenPopover(false);
                setShowAdvancedModal(true);
              }}
              text={
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <Settings
                      className={cn(
                        "mr-1 size-4 text-neutral-950",
                        data.externalId && "text-blue-500",
                      )}
                    />
                    Advanced Settings
                  </div>
                  <kbd className="hidden size-6 cursor-default items-center justify-center rounded-md border border-neutral-200 font-sans text-xs text-neutral-800 sm:flex">
                    A
                  </kbd>
                </div>
              }
            />
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
