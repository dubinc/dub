import { withSession } from "@/lib/auth";
import { plain } from "@/lib/plain/client";
import { upsertPlainCustomer } from "@/lib/plain/upsert-plain-customer";
import { AttachmentType } from "@team-plain/typescript-sdk";

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_FILE_NAME_LENGTH = 255;

const ACCEPTED_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".pdf",
  ".txt",
  ".csv",
]);

// POST /api/ai/support-chat/upload
// Generates a Plain attachment upload URL for the authenticated user.
// The client uses the returned URL + form fields to POST the file directly
// to Plain's storage (no file data passes through this server).
export const POST = withSession(async ({ req, session }) => {
  if (!session.user.email) {
    return new Response("User email is required", { status: 400 });
  }

  let fileName: string;
  let fileSizeBytes: number;
  try {
    ({ fileName, fileSizeBytes } = await req.json());
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  if (
    !fileName ||
    typeof fileName !== "string" ||
    fileName.length > MAX_FILE_NAME_LENGTH ||
    // Reject path traversal and null bytes
    fileName.includes("..") ||
    fileName.includes("/") ||
    fileName.includes("\0")
  ) {
    return new Response("Invalid fileName", { status: 400 });
  }

  if (
    typeof fileSizeBytes !== "number" ||
    fileSizeBytes <= 0 ||
    fileSizeBytes > MAX_UPLOAD_SIZE_BYTES
  ) {
    return new Response(
      `Invalid fileSizeBytes: must be between 1 and ${MAX_UPLOAD_SIZE_BYTES} bytes`,
      { status: 400 },
    );
  }

  const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
  if (!ext || !ACCEPTED_EXTENSIONS.has(ext)) {
    return new Response(
      `Unsupported file type. Accepted: ${[...ACCEPTED_EXTENSIONS].join(", ")}`,
      { status: 400 },
    );
  }

  // Ensure the Plain customer exists and get their Plain-scoped ID
  const { data: customerData, error: customerError } =
    await upsertPlainCustomer({
      id: session.user.id,
      name: session.user.name ?? "",
      email: session.user.email,
    });

  if (customerError || !customerData) {
    console.error("Failed to upsert Plain customer:", customerError);
    return new Response("Failed to resolve support customer", { status: 500 });
  }

  const { data, error } = await plain.createAttachmentUploadUrl({
    attachmentType: AttachmentType.CustomTimelineEntry,
    customerId: customerData.customer.id,
    fileName,
    fileSizeBytes,
  });

  if (error || !data) {
    console.error("Failed to create Plain attachment upload URL:", error);
    return new Response("Failed to create upload URL", { status: 500 });
  }

  const { attachment, uploadFormUrl, uploadFormData } = data;

  return Response.json({
    attachmentId: attachment.id,
    uploadFormUrl,
    // Key-value pairs the client appends to the multipart FormData before POSTing
    uploadFormData,
  });
});
