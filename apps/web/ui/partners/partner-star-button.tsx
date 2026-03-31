import { updateDiscoveredPartnerAction } from "@/lib/actions/partners/update-discovered-partner";
import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { NetworkPartnerProps } from "@/lib/types";
import { Button } from "@dub/ui";
import { Star, StarFill } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { mutate } from "swr";

type PartnerStarButtonProps = {
  partner: NetworkPartnerProps;
  onToggleStarred?: (starred: boolean) => void | Promise<void>;
  className?: string;
  iconSize?: string;
};

export function PartnerStarButton({
  partner,
  onToggleStarred,
  className,
  iconSize = "size-4",
}: PartnerStarButtonProps) {
  const { id: workspaceId } = useWorkspace();

  const { executeAsync: updateDiscoveredPartner } = useAction(
    updateDiscoveredPartnerAction,
  );

  const handleToggleStarred = async (starred: boolean) => {
    // If a custom handler is provided, use it (e.g., for page-client.tsx with mutatePartners)
    if (onToggleStarred) {
      await onToggleStarred(starred);
      return;
    }

    // Otherwise, handle the mutation internally (e.g., for partner-info-cards)
    // First, optimistically update all relevant cache entries
    mutate(
      (key) =>
        typeof key === "string" && key.startsWith("/api/network/partners"),
      (data: any) => {
        if (!data || !Array.isArray(data)) return data;
        return data.map((p) =>
          p.id === partner.id
            ? {
                ...p,
                starredAt: starred ? new Date() : null,
              }
            : p,
        );
      },
      { revalidate: false },
    );

    // Then make the API call and update with server response
    try {
      const result = await updateDiscoveredPartner({
        workspaceId: workspaceId!,
        partnerId: partner.id,
        starred,
      });

      if (!result?.data) {
        toast.error("Failed to star partner");
        // Revert optimistic update on error by revalidating
        mutatePrefix("/api/network/partners");
        return;
      }

      // Update with server response
      const serverData = result.data;
      mutate(
        (key) =>
          typeof key === "string" && key.startsWith("/api/network/partners"),
        (data: any) => {
          if (!data || !Array.isArray(data)) return data;
          return data.map((p) =>
            p.id === partner.id ? { ...p, starredAt: serverData.starredAt } : p,
          );
        },
        { revalidate: false },
      );
    } catch (error) {
      // Revert optimistic update on error
      mutatePrefix("/api/network/partners");
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => handleToggleStarred(!partner.starredAt)}
      icon={
        partner.starredAt ? (
          <StarFill className={cn("text-amber-500", iconSize)} />
        ) : (
          <Star className={cn("text-content-subtle", iconSize)} />
        )
      }
      className={cn("rounded-lg p-0", className)}
    />
  );
}
