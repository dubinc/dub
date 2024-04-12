import { withSession } from "@/lib/auth";
import { plain } from "@/lib/plain";
import { AttachmentType } from "@team-plain/typescript-sdk";
import { NextResponse } from "next/server";

// POST /api/support/upload – upload a file
export const POST = withSession(async ({ req, session }) => {
  const res = await plain.createAttachmentUploadUrl({
    customerId: "c_XXXXXXXXXXXXXXXXXXXXXXXXXX",
    fileName: "the-filename.jpeg",
    fileSizeBytes: 32318,
    attachmentType: AttachmentType.CustomTimelineEntry,
  });

  if (res.error) {
    console.error(res.error);
  } else {
    console.log("Attachment upload url created");
    console.log(res.data);
  }

  return NextResponse.json({
    success: true,
  });
});
