import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { sendBatchEmail } from "@dub/email";
import { ResendEmailOptions } from "@dub/email/resend/types";
import PartnerPayoutConfirmed from "@dub/email/templates/partner-payout-confirmed";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";
import React from "react";
import { z } from "zod";

const TEMPLATE_MAP = {
  PartnerPayoutConfirmed,
};

export const dynamic = "force-dynamic";

export const batchEmailPayloadSchema = z.array(
  z.object({
    templateName: z.string(),
    templateProps: z.record(z.any()),
    to: z.string().email(),
    from: z.string().optional(),
    subject: z.string(),
    bcc: z.union([z.string(), z.array(z.string())]).optional(),
    replyTo: z.string().optional(),
    variant: z.enum(["primary", "notifications", "marketing"]).optional(),
    headers: z.record(z.string()).optional(),
    tags: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
    scheduledAt: z.string().optional(),
  }),
);

interface BatchError {
  email: string;
  templateName: string;
  error: string;
}

// POST /api/cron/send-batch-email
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    const payload = batchEmailPayloadSchema.parse(JSON.parse(rawBody));

    console.log(`Processing batch of ${payload.length} email(s)`);

    // Process each email and build Resend payload
    const emailsToSend: ResendEmailOptions[] = [];
    const errors: BatchError[] = [];

    for (const emailItem of payload) {
      try {
        const TemplateComponent = TEMPLATE_MAP[emailItem.templateName];

        if (!TemplateComponent) {
          throw new Error(
            `Template "${emailItem.templateName}" not found in TEMPLATE_MAP`,
          );
        }

        const react = React.createElement(
          TemplateComponent,
          emailItem.templateProps,
        );

        emailsToSend.push({
          react,
          from: emailItem.from,
          to: emailItem.to,
          subject: emailItem.subject,
          variant: emailItem.variant,
          ...(emailItem.replyTo && { replyTo: emailItem.replyTo }),
          ...(emailItem.headers && { headers: emailItem.headers }),
          ...(emailItem.tags && { tags: emailItem.tags }),
          ...(emailItem.scheduledAt && { scheduledAt: emailItem.scheduledAt }),
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        console.error(
          `Failed to process email template ${emailItem.templateName} for ${emailItem.to}:`,
          errorMessage,
        );

        errors.push({
          email: emailItem.to,
          templateName: emailItem.templateName,
          error: errorMessage,
        });

        await log({
          message: `Failed to import/render email template "${emailItem.templateName}" for ${emailItem.to}: ${errorMessage}`,
          type: "errors",
        });
      }
    }

    if (emailsToSend.length === 0) {
      console.error("No emails were successfully processed.");

      await log({
        message: `Batch email processing failed: All ${payload.length} email(s) failed to process`,
        type: "errors",
        mention: true,
      });

      return NextResponse.json(
        {
          success: false,
          processed: 0,
          failed: payload.length,
          errors,
        },
        { status: 500 },
      );
    }

    console.log(`Sending ${emailsToSend.length} email(s) via Resend.`);

    const { data, error } = await sendBatchEmail(emailsToSend);

    if (error) {
      console.error("Resend API error:", error);

      await log({
        message: `Resend batch send failed: ${JSON.stringify(error)}`,
        type: "errors",
        mention: true,
      });

      return NextResponse.json(
        {
          success: false,
          processed: 0,
          failed: emailsToSend.length,
          errors: [
            ...errors,
            {
              error: "Resend API error",
              details: error,
            },
          ],
        },
        { status: 500 },
      );
    }

    if (data) {
      console.log(`Successfully sent ${emailsToSend.length} email(s).`, data);
    }

    return NextResponse.json({
      success: true,
      sent: emailsToSend.length,
      failed: errors.length,
      ...(errors.length > 0 && { processingErrors: errors }),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    await log({
      message: `Error processing batch email queue: ${errorMessage}`,
      type: "errors",
      mention: true,
    });

    return handleAndReturnErrorResponse(error);
  }
}
