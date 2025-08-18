import { createQRTrackingParams } from "@/lib/analytic/create-qr-tracking-data.helper.ts";
import { mutatePrefix } from "@/lib/swr/mutate.ts";
import { useUserCache } from "@/lib/swr/use-user.ts";
import useWorkspace from "@/lib/swr/use-workspace.ts";
import {
  convertQRBuilderDataToServer,
  convertQRForUpdate,
} from "@/ui/qr-builder/helpers/data-converters.ts";
import { QRBuilderData } from "@/ui/qr-builder/types/types.ts";
import { useToastWithUndo } from "@dub/ui";
import { SHORT_DOMAIN } from "@dub/utils/src";
import { trackClientEvents } from "core/integration/analytic";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface.ts";
import { useParams } from "next/navigation";
import { useCallback } from "react";
import { toast } from "sonner";

export const useQrOperations = () => {
  const params = useParams() as { slug?: string };
  const { slug } = params;
  const { id: workspaceId } = useWorkspace();
  const { user } = useUserCache();
  const toastWithUndo = useToastWithUndo();

  const createQr = useCallback(
    async (qrBuilderData: QRBuilderData) => {
      console.log("createQr", qrBuilderData);
      try {
        if (!workspaceId) {
          toast.error("Workspace ID not found");
          return false;
        }

        console.log("qrBuilderData", qrBuilderData);
        const serverData = await convertQRBuilderDataToServer(qrBuilderData, {
          domain: SHORT_DOMAIN!,
        });
        console.log("serverData", serverData);

        const res = await fetch(`/api/qrs?workspaceId=${workspaceId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(serverData),
        });

        if (res.status === 200) {
          await mutatePrefix(["/api/qrs", "/api/links"]);

          const responseData = await res.json();
          const createdQrId = responseData?.id;

          // Track QR created event
          const trackingParams = createQRTrackingParams(
            qrBuilderData,
            createdQrId,
          );
          trackClientEvents({
            event: EAnalyticEvents.QR_CREATED,
            params: {
              event_category: "Authorized",
              page_name: "profile",
              email: user?.email,
              ...trackingParams,
            },
            sessionId: user?.id,
          });

          toast.success("Successfully created QR!");
          return true;
        } else {
          const { error } = await res.json();
          toast.error(error?.message || "Failed to create QR");
          return false;
        }
      } catch (e) {
        console.error("Failed to create QR", e);
        toast.error("Failed to create QR");
        return false;
      }
    },
    [workspaceId, slug, user],
  );

  const updateQrWithOriginal = useCallback(
    async (originalQR: any, qrBuilderData: QRBuilderData) => {
      try {
        if (!workspaceId) {
          toast.error("Workspace ID not found");
          return false;
        }

        const domain = SHORT_DOMAIN!;

        const updateResult = await convertQRForUpdate(
          originalQR,
          qrBuilderData,
          {
            domain,
          },
        );

        if (!updateResult.hasChanges) {
          toast.info("No changes to save");
          return true;
        }

        const res = await fetch(
          `/api/qrs/${originalQR.id}?workspaceId=${workspaceId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updateResult.updateData),
          },
        );

        if (res.status === 200) {
          await mutatePrefix([
            "/api/qrs",
            "/api/links",
            `/api/workspaces/${slug}`,
          ]);

          // Track QR updated event
          const trackingParams = createQRTrackingParams(
            qrBuilderData,
            originalQR.id,
          );
          trackClientEvents({
            event: EAnalyticEvents.QR_UPDATED,
            params: {
              event_category: "Authorized",
              page_name: "profile",
              email: user?.email,
              ...trackingParams,
            },
            sessionId: user?.id,
          });

          toast.success("Successfully updated QR!");
          return true;
        } else {
          const { error } = await res.json();
          toast.error(error?.message || "Failed to update QR");
          return false;
        }
      } catch (e) {
        console.error("Failed to update QR", e);
        toast.error("Failed to update QR");
        return false;
      }
    },
    [workspaceId, slug, user, createQRTrackingParams],
  );

  const archiveQr = useCallback(
    async (qrId: string, archive: boolean) => {
      try {
        if (!workspaceId) {
          toast.error("Workspace ID not found");
          return false;
        }

        const res = await fetch(`/api/qrs/${qrId}?workspaceId=${workspaceId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ archived: archive }),
        });

        if (res.status === 200) {
          await mutatePrefix(["/api/qrs", "/api/links"]);

          toastWithUndo({
            id: "qr-archive-undo-toast",
            message: `Successfully ${archive ? "paused" : "unpaused"} QR!`,
            undo: () => {
              toast.promise(archiveQr(qrId, !archive), {
                loading: "Undo in progress...",
                error: "Failed to roll back changes. An error occurred.",
                success: () => {
                  return "Undo successful! Changes reverted.";
                },
              });
            },
            duration: 5000,
          });

          return true;
        } else {
          const { error } = await res.json();
          toast.error(error?.message || "Failed to archive QR");
          return false;
        }
      } catch (e) {
        console.error("Failed to archive QR", e);
        toast.error("Failed to archive QR");
        return false;
      }
    },
    [workspaceId, toastWithUndo],
  );

  const deleteQr = useCallback(
    async (qrId: string) => {
      try {
        if (!workspaceId) {
          toast.error("Workspace ID not found");
          return false;
        }

        const res = await fetch(`/api/qrs/${qrId}?workspaceId=${workspaceId}`, {
          method: "DELETE",
        });

        if (res.status === 200) {
          await mutatePrefix(["/api/qrs", "/api/links"]);
          toast.success("Successfully deleted QR!");
          return true;
        } else {
          const { error } = await res.json();
          toast.error(error?.message || "Failed to delete QR");
          return false;
        }
      } catch (e) {
        console.error("Failed to delete QR", e);
        toast.error("Failed to delete QR");
        return false;
      }
    },
    [workspaceId],
  );

  return {
    createQr,
    updateQrWithOriginal,
    archiveQr,
    deleteQr,
  };
};
