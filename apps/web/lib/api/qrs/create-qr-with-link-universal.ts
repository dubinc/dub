import { DubApiError, ErrorCodes } from "@/lib/api/errors";
import { createLink, processLink } from "@/lib/api/links";
import { NewQrProps, WorkspaceProps } from "@/lib/types";
import { createQr } from "./create-qr";

interface CreateQrWithLinkOptions {
  qrData: NewQrProps;
  linkData: {
    url: string;
    [key: string]: any;
  };

  workspace: Pick<WorkspaceProps, "id" | "plan" | "flags"> | undefined;
  userId?: string | null;
  fileId?: string | null;

  homePageDemo?: boolean;

  onLinkCreated?: (link: any) => Promise<void> | void;
}

export async function createQrWithLinkUniversal({
  qrData,
  linkData,
  workspace,
  userId,
  fileId,
  homePageDemo = false,
  onLinkCreated,
}: CreateQrWithLinkOptions) {
  const { link, error, code } = await processLink({
    payload: linkData,
    workspace,
    ...(userId && { userId }),
  });

  if (error != null) {
    throw new DubApiError({
      code: code as ErrorCodes,
      message: error,
    });
  }

  try {
    const createdLink = await createLink(link);

    if (onLinkCreated) {
      await onLinkCreated(createdLink);
    }

    const createdQr = await createQr(
      qrData,
      createdLink.shortLink,
      createdLink.id,
      createdLink.userId,
      fileId || null,
      homePageDemo,
    );

    return { createdLink, createdQr };
  } catch (error) {
    throw new DubApiError({
      code: "unprocessable_entity",
      message: error.message,
    });
  }
}
