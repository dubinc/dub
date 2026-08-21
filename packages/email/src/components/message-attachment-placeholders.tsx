import { formatFileSize } from "@dub/utils";
import { Column, Link, Row, Text } from "@react-email/components";

const ATTACHMENT_MIME_TYPE_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
  "image/png": "PNG",
  "image/jpeg": "JPG",
  "image/webp": "WEBP",
};

const ATTACHMENT_MIME_TYPE_COLOR: Record<string, string> = {
  "application/pdf": "#e11d48",
  "image/png": "#2563eb",
  "image/jpeg": "#3b82f6",
  "image/webp": "#3b82f6",
};

function getAttachmentTypeLabel(mimeType: string): string {
  return (
    ATTACHMENT_MIME_TYPE_LABELS[mimeType] ||
    mimeType.split("/").pop()?.toUpperCase() ||
    "FILE"
  );
}

export type MessageAttachmentPlaceholder = {
  name: string;
  size: number;
  type: string;
};

export function MessageAttachmentPlaceholders({
  attachments,
  href,
}: {
  attachments: MessageAttachmentPlaceholder[];
  href: string;
}) {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <>
      {attachments.map((attachment, idx) => (
        <Link
          key={`${attachment.name}-${idx}`}
          href={href}
          className="mt-2 block no-underline"
        >
          <Row className="rounded-lg border border-solid border-neutral-200 bg-neutral-50 p-1 pr-3">
            <Column style={{ width: 48 }}>
              <div
                className="flex size-12 flex-col items-center justify-center rounded-md text-[10px] font-semibold uppercase text-white"
                style={{
                  backgroundColor:
                    ATTACHMENT_MIME_TYPE_COLOR[attachment.type] || "#737373",
                }}
              >
                <Text className="my-0 text-[10px] font-semibold uppercase text-white">
                  {getAttachmentTypeLabel(attachment.type)}
                </Text>
              </div>
            </Column>
            <Column className="pl-3">
              <Text className="my-0 truncate text-sm font-medium text-neutral-900">
                {attachment.name}
              </Text>
              <Text className="my-0 text-xs font-medium text-neutral-500">
                {formatFileSize(attachment.size, 1)}
              </Text>
            </Column>
          </Row>
        </Link>
      ))}
    </>
  );
}
