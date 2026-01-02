import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { EMAIL_TEMPLATES_MAP } from "@/lib/email/email-templates-map";
import { sendBatchEmail } from "@dub/email";
import { ResendEmailOptions } from "@dub/email/resend/types";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";
import React from "react";
import * as z from "zod/v4";

export const dynamic = "force-dynamic";

const batchEmailPayloadSchema = z.array(
  z.object({
    templateName: z.enum(
      Object.keys(EMAIL_TEMPLATES_MAP) as [string, ...string[]],
    ),
    templateProps: z.record(z.string(), z.any()),
    to: z.email(),
    from: z.string().optional(),
    subject: z.string(),
    bcc: z.union([z.string(), z.array(z.string())]).optional(),
    replyTo: z.string().optional(),
    variant: z.enum(["primary", "notifications", "marketing"]).optional(),
    headers: z.record(z.string(), z.string()).optional(),
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

    const idempotencyKey = req.headers.get("Idempotency-Key") || undefined;

    console.log(`Processing batch of ${payload.length} email(s)`);

    // Process all emails in parallel and build Resend payload
    const results = await Promise.allSettled(
      payload.map(async (emailItem) => {
        const TemplateComponent = EMAIL_TEMPLATES_MAP[emailItem.templateName];

        if (!TemplateComponent) {
          throw new Error(
            `Template "${emailItem.templateName}" not found in TEMPLATE_MAP`,
          );
        }

        const react = React.createElement(
          TemplateComponent,
          emailItem.templateProps,
        );

        return {
          emailItem,
          emailPayload: {
            react,
            from: emailItem.from,
            to: emailItem.to,
            subject: emailItem.subject,
            variant: emailItem.variant,
            ...(emailItem.bcc && { bcc: emailItem.bcc }),
            ...(emailItem.replyTo && { replyTo: emailItem.replyTo }),
            ...(emailItem.headers && { headers: emailItem.headers }),
            ...(emailItem.tags && { tags: emailItem.tags }),
            ...(emailItem.scheduledAt && {
              scheduledAt: emailItem.scheduledAt,
            }),
          },
        };
      }),
    );

    // Separate successes and failures
    const emailsToSend: ResendEmailOptions[] = [];
    const errors: BatchError[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const emailItem = payload[i];

      if (result.status === "fulfilled") {
        emailsToSend.push(result.value.emailPayload);
      } else {
        const errorMessage =
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason);

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

    const { data, error } = await sendBatchEmail(emailsToSend, {
      idempotencyKey,
    });

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
