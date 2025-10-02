import { mutatePrefix } from "@/lib/swr/mutate.ts";
import useWorkspace from "@/lib/swr/use-workspace.ts";
import { SHORT_DOMAIN } from "@dub/utils/src";
import { useCallback } from "react";
import { toast } from "sonner";
import { convertNewQRBuilderDataToServer, TNewQRBuilderData, TQrServerData } from "../helpers/data-converters";

export const useNewQrOperations = () => {
  const { id: workspaceId } = useWorkspace();

  const createQr = useCallback(
    async (builderData: TNewQRBuilderData, retryCount = 0) => {
      try {
        if (!workspaceId) {
          toast.error("Workspace ID not found");
          return false;
        }

        // Convert new builder data to server format
        const serverData = await convertNewQRBuilderDataToServer(builderData, {
          domain: SHORT_DOMAIN!,
        });

        console.log(serverData,'serverData11111');
        
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
          toast.success("Successfully created QR!");
          return responseData;
        } else {
          const errorResponse = await res.json();
          console.error("API Error Response:", errorResponse);
          const errorMessage = errorResponse?.error?.message || "Failed to create QR";

          // Check if it's a body consumption error and retry
          if (errorMessage.includes("Body is unusable") || errorMessage.includes("already been read")) {
            if (retryCount < 2) {
              // Add a small delay before retry
              await new Promise(resolve => setTimeout(resolve, 500));
              return createQr(builderData, retryCount + 1);
            } else {
              toast.error("Request failed after multiple attempts. Please try again.");
              return false;
            }
          }

          console.error("Error creating QR:", errorMessage);
          toast.error(errorMessage);
          return false;
        }
      } catch (e) {
        console.error("Failed to create QR", e);

        // Check if it's a network-level body consumption error and retry
        if (e instanceof Error && (e.message.includes("Body is unusable") || e.message.includes("already been read")) && retryCount < 2) {
          await new Promise(resolve => setTimeout(resolve, 500));
          return createQr(builderData, retryCount + 1);
        }

        toast.error("Failed to create QR");
        return false;
      }
    },
    [workspaceId],
  );

  const updateQr = useCallback(
    async (originalQR: TQrServerData, builderData: TNewQRBuilderData, retryCount = 0) => {
      try {
        if (!workspaceId) {
          toast.error("Workspace ID not found");
          return false;
        }

        // Convert new builder data to server format
        const newServerData = await convertNewQRBuilderDataToServer(builderData, {
          domain: SHORT_DOMAIN!,
        });

        // Simple comparison to check for changes
        const hasChanges =
          newServerData.title !== originalQR.title ||
          newServerData.qrType !== originalQR.qrType ||
          newServerData.data !== originalQR.data ||
          JSON.stringify(newServerData.styles) !== JSON.stringify(originalQR.styles) ||
          JSON.stringify(newServerData.frameOptions) !== JSON.stringify(originalQR.frameOptions) ||
          newServerData.fileId !== originalQR.fileId;

        if (!hasChanges) {
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
            body: JSON.stringify(newServerData),
          },
        );

        if (res.status === 200) {
          await mutatePrefix(["/api/qrs", "/api/links"]);
          const responseData = await res.json();
          toast.success("Successfully updated QR!");
          return responseData;
        } else {
          const errorResponse = await res.json();
          const errorMessage = errorResponse?.error?.message || "Failed to update QR";

          // Check if it's a body consumption error and retry
          if (errorMessage.includes("Body is unusable") || errorMessage.includes("already been read")) {
            if (retryCount < 2) {
              await new Promise(resolve => setTimeout(resolve, 500));
              return updateQr(originalQR, builderData, retryCount + 1);
            } else {
              toast.error("Update failed after multiple attempts. Please try again.");
              return false;
            }
          }

          toast.error(errorMessage);
          return false;
        }
      } catch (e) {
        console.error("Failed to update QR", e);

        // Check if it's a network-level body consumption error and retry
        if (e instanceof Error && (e.message.includes("Body is unusable") || e.message.includes("already been read")) && retryCount < 2) {
          await new Promise(resolve => setTimeout(resolve, 500));
          return updateQr(originalQR, builderData, retryCount + 1);
        }

        toast.error("Failed to update QR");
        return false;
      }
    },
    [workspaceId],
  );

  return {
    createQr,
    updateQr,
  };
};