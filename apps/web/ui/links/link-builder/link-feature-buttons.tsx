import { useExpirationModal } from "@/ui/modals/link-builder/expiration-modal";
import { MoreDropdown } from "@/ui/modals/link-builder/more-dropdown";
import { usePasswordModal } from "@/ui/modals/link-builder/password-modal";
import { useTargetingModal } from "@/ui/modals/link-builder/targeting-modal";
import { useUTMModal } from "@/ui/modals/link-builder/utm-modal";
import { WebhookSelect } from "@/ui/modals/link-builder/webhook-select";
import { cn } from "@dub/utils";

export function LinkFeatureButtons({
  variant = "page",
  className,
}: {
  variant?: "page" | "modal";
  className?: string;
}) {
  const { UTMModal, UTMButton } = useUTMModal();
  const { ExpirationModal, ExpirationButton } = useExpirationModal();
  const { TargetingModal, TargetingButton } = useTargetingModal();
  const { PasswordModal, PasswordButton } = usePasswordModal();

  return (
    <>
      <PasswordModal />
      <UTMModal />
      <TargetingModal />
      <ExpirationModal />

      <div className={cn("flex min-w-0 items-center gap-2", className)}>
        <UTMButton />
        <div
          className={cn(
            "flex items-center gap-2 max-sm:hidden",
            variant === "page" && "max-[960px]:hidden",
          )}
        >
          <ExpirationButton />
          <TargetingButton />
          <PasswordButton />
        </div>
        <WebhookSelect />
        <MoreDropdown />
      </div>
    </>
  );
}
