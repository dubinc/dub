import { mutatePrefix } from "@/lib/swr/mutate.ts";
import useWorkspace from "@/lib/swr/use-workspace.ts";
import { fileToBase64 } from "@/ui/utils/file-to-base64";
import { SHORT_DOMAIN } from "@dub/utils/src";
import { useParams } from "next/navigation";
import { useCallback } from "react";
import { toast } from "sonner";

export interface QrUpdateData {
  title?: string;
  description?: string;
  data?: string;
  styles?: any;
  frameOptions?: {
    id: string;
  };
  qrType?: string;
  files?: File[];
  archived?: boolean;
}

export interface FullQrCreateData extends QrUpdateData {
  data: string;
  styles: any;
  frameOptions: {
    id: string;
  };
  qrType: string;
  files: File[];
}

export function useQrSave() {
  const params = useParams() as { slug?: string };
  const { slug } = params;
  const { id: workspaceId } = useWorkspace();

  const createQr = useCallback(
    async (data: FullQrCreateData) => {
      try {
        const file = data.files && data.files.length > 0 ? data.files[0] : null;
        const body = {
          ...data,
          data: data.styles.data,
          file: file ? await fileToBase64(file) : undefined,
          link: {
            url: data.styles.data,
            domain: SHORT_DOMAIN,
            tagId: null,
            tags: [],
            webhookIds: [],
          },
        };

        const res = await fetch(`/api/qrs?workspaceId=${workspaceId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (res.status === 200) {
          await mutatePrefix([
            "/api/qrs",
            "/api/links",
            `/api/workspaces/${slug}`,
          ]);

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
    async (qrId: string, data: QrUpdateData) => {
      try {
        const file = data.files && data.files.length > 0 ? data.files[0] : null;
        const body = {
          ...data,
          ...(data.styles && { data: data.styles.data }),
          ...(file && { file: await fileToBase64(file) }),
          ...(data.data && {
            link: {
              url: data.data,
              domain: SHORT_DOMAIN,
              tagId: null,
              tags: [],
              webhookIds: [],
            },
          }),
        };

        const res = await fetch(`/api/qrs/${qrId}?workspaceId=${workspaceId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
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
}
