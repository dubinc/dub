import { withSession } from "@/lib/auth";
import { plain, upsertPlainCustomer } from "@/lib/plain";
import { AttachmentType } from "@team-plain/typescript-sdk";
import { NextResponse } from "next/server";

// POST /api/support/upload – get a signed URL to upload an attachment
export const GET = withSession(async ({ searchParams, session }) => {
  let plainCustomerId: string | null = null;

  const plainCustomer = await plain.getCustomerByEmail({
    email: session.user.email,
  });

  if (plainCustomer.data) {
    plainCustomerId = plainCustomer.data.id;
  } else {
    const { data } = await upsertPlainCustomer(session.user);
    if (data) {
      plainCustomerId = data.customer.id;
    }
  }

  if (!plainCustomerId) {
    return NextResponse.json({
      error: "Plain customer not found",
    });
  }

  const res = await plain.createAttachmentUploadUrl({
    customerId: plainCustomerId,
    fileName: searchParams.name,
    fileSizeBytes: parseInt(searchParams.size),
    attachmentType: AttachmentType.CustomTimelineEntry,
  });

  if (res.error) {
    return NextResponse.json({
      error: res.error,
    });
  } else {
    console.log("Attachment upload stuff:", res.data);
    return NextResponse.json(res.data);
  }
});
