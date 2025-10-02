import { saveQrDataToRedisAction } from "@/lib/actions/save-qr-data-to-redis";
import { useLocalStorage } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useCallback } from "react";
import {
  convertNewBuilderToStorageFormat,
  TNewQRBuilderData,
  TQRBuilderDataForStorage,
} from "../helpers/data-converters";

export const useQRSaveToSignUp = (sessionId: string) => {
  const [qrDataToCreate, setQrDataToCreate] =
    useLocalStorage<TQRBuilderDataForStorage | null>("qr-data-to-create", null);

  const { executeAsync: saveQrDataToRedis } = useAction(
    saveQrDataToRedisAction,
  );

  const saveQrDataForDownload = useCallback(
    async (builderData: TNewQRBuilderData) => {
      try {
        // Convert new builder data to storage format for localStorage/Redis
        console.log("Download: Input builder data:", builderData);
        const storageData = convertNewBuilderToStorageFormat(builderData);
        console.log("Download: Converted to storage data:", storageData);

        // Check if data has changed to avoid unnecessary saves
        const newDataJSON = JSON.stringify(storageData);
        const qrDataToCreateJSON = JSON.stringify(qrDataToCreate) ?? "{}";

        if (newDataJSON !== qrDataToCreateJSON) {
          // Save to localStorage
          setQrDataToCreate(storageData);

          // Save to Redis
          console.log("Download: Saving to Redis with sessionId:", sessionId);
          await saveQrDataToRedis({
            sessionId,
            qrData: storageData,
          });

          console.log("Download: Successfully saved to localStorage and Redis");
        } else {
          console.log("Download: Data unchanged, skipping save");
        }

        return true;
      } catch (error) {
        console.error("Error saving QR data for download:", error);
        return false;
      }
    },
    [sessionId, qrDataToCreate, setQrDataToCreate, saveQrDataToRedis],
  );

  return {
    saveQrDataForDownload,
    qrDataToCreate,
  };
};
