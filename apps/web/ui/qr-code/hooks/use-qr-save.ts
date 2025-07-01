import {
  QRBuilderData,
  convertQRBuilderDataToServer,
  convertQRBuilderDataToUpdate,
} from "@/lib/qr-types.ts";
import { mutatePrefix } from "@/lib/swr/mutate.ts";
import useWorkspace from "@/lib/swr/use-workspace.ts";
import { fileToBase64 } from "@/ui/utils/file-to-base64";
import { SHORT_DOMAIN } from "@dub/utils/src";
import { useParams } from "next/navigation";
import { useCallback } from "react";
import { toast } from "sonner";

export const useQrSave = () => {
  const params = useParams() as { slug?: string };
  const { slug } = params;
  const { id: workspaceId } = useWorkspace();

  const createQr = useCallback(
    async (qrBuilderData: QRBuilderData) => {
      try {
        if (!workspaceId) {
          toast.error("Workspace ID not found");
          return false;
        }

        const serverData = await convertQRBuilderDataToServer(qrBuilderData, {
          domain: SHORT_DOMAIN!,
          fileToBase64: async (file: File) => {
            const result = await fileToBase64(file);
            return typeof result === "string" ? result : "";
          },
        });

        const res = await fetch(`/api/qrs?workspaceId=${workspaceId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(serverData),
        });

        if (res.status === 200) {
          await mutatePrefix(["/api/qrs", "/api/links"]);

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
    [workspaceId, slug],
  );

  const updateQr = useCallback(
    async (qrId: string, qrBuilderData: QRBuilderData) => {
      try {
        if (!workspaceId) {
          toast.error("Workspace ID not found");
          return false;
        }

        const domain = SHORT_DOMAIN || "dub.sh";

        const serverData = await convertQRBuilderDataToUpdate(qrBuilderData, {
          domain,
          fileToBase64: async (file: File) => {
            const result = await fileToBase64(file);
            return typeof result === "string" ? result : "";
          },
        });

        const res = await fetch(`/api/qrs/${qrId}?workspaceId=${workspaceId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(serverData),
        });

        if (res.status === 200) {
          await mutatePrefix([
            "/api/qrs",
            "/api/links",
            `/api/workspaces/${slug}`,
          ]);

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
    [workspaceId, slug],
  );

  return {
    createQr,
    updateQr,
  };
};
