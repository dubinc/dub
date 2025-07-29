"use server";

import { verifyAndCreateUser } from "@/lib/actions/verify-and-create-user.ts";
import { createQRTrackingParams } from "@/lib/analytic/create-qr-tracking-data.helper.ts";
import { WorkspaceProps } from "@/lib/types.ts";
import { ratelimit, redis } from "@/lib/upstash";
import { QR_TYPES } from "@/ui/qr-builder/constants/get-qr-config.ts";
import { convertQrStorageDataToBuilder } from "@/ui/qr-builder/helpers/data-converters.ts";
import { QrStorageData } from "@/ui/qr-builder/types/types.ts";
import { CUSTOMER_IO_TEMPLATES, sendEmail } from "@dub/email";
import { prisma } from "@dub/prisma";
import { HOME_DOMAIN, R2_URL } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { CustomerIOClient } from "core/lib/customerio/customerio.config.ts";
import { getUserCookieService } from "core/services/cookie/user-session.service.ts";
import { flattenValidationErrors } from "next-safe-action";
import { EAnalyticEvents } from "../../core/integration/analytic/interfaces/analytic.interface.ts";
import { trackMixpanelApiService } from "../../core/integration/analytic/services/track-mixpanel-api.service.ts";
import { createQrWithLinkUniversal } from "../api/qrs/create-qr-with-link-universal";
import { createId, getIP } from "../api/utils";
import z from "../zod";
import { signUpSchema } from "../zod/schemas/auth";
import { throwIfAuthenticated } from "./auth/throw-if-authenticated";
import { actionClient } from "./safe-action";

const qrDataToCreateSchema = z.object({
  title: z.string(),
  styles: z.object({}).passthrough(),
  frameOptions: z.object({
    id: z.string(),
    color: z.string().optional(),
    textColor: z.string().optional(),
    text: z.string().optional(),
  }),
  qrType: z.enum([
    "website",
    "pdf",
    "image",
    "video",
    "whatsapp",
    "social",
    "wifi",
    "app",
    "feedback",
  ]),
  fileId: z.string().optional().describe("The file the link leads to"),
});

const schema = signUpSchema.extend({
  code: z.string().min(6, "OTP must be 6 characters long."),
  qrDataToCreate: qrDataToCreateSchema.nullish(),
});

// Sign up a new user using email and password
export const createUserAccountAction = actionClient
  .schema(schema, {
    handleValidationErrorsShape: (ve) =>
      flattenValidationErrors(ve).fieldErrors,
  })
  .use(throwIfAuthenticated)
  .action(async ({ parsedInput }) => {
    const { email, password, code, qrDataToCreate } = parsedInput;

    const { success } = await ratelimit(2, "1 m").limit(`signup:${getIP()}`);

    if (!success) {
      throw new Error("Too many requests. Please try again later.");
    }

    const { sessionId } = await getUserCookieService();
    const generatedUserId = sessionId ?? createId({ prefix: "user_" });

    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: {
        identifier: email,
        token: code,
        expires: {
          gte: new Date(),
        },
      },
    });

    if (!verificationToken) {
      throw new Error("Invalid verification code entered.");
    }

    const { workspace: workspaceResponse, user: createdUser } =
      await verifyAndCreateUser({
        userId: generatedUserId,
        email,
        code,
        password,
      });

    waitUntil(
      Promise.all([
        ...(qrDataToCreate
          ? [
              (async () => {
                const linkUrl = qrDataToCreate?.fileId
                  ? `${R2_URL}/qrs-content/${qrDataToCreate.fileId}`
                  : (qrDataToCreate!.styles!.data! as string);

                const qrCreateResponse = await createQrWithLinkUniversal({
                  qrData: {
                    data: qrDataToCreate?.styles?.data as string,
                    qrType: qrDataToCreate?.qrType as any,
                    title: qrDataToCreate?.title,
                    description: undefined,
                    styles: qrDataToCreate?.styles,
                    frameOptions: qrDataToCreate?.frameOptions,
                    fileId: qrDataToCreate?.fileId,
                    link: {
                      url: linkUrl,
                    },
                  },
                  linkData: {
                    url: linkUrl,
                  },
                  workspace: workspaceResponse as Pick<
                    WorkspaceProps,
                    "id" | "plan" | "flags"
                  >,
                  userId: generatedUserId,
                });

                const trackingParams = createQRTrackingParams(
                  convertQrStorageDataToBuilder(
                    qrCreateResponse.createdQr as QrStorageData,
                  ),
                  qrCreateResponse.createdQr.id,
                );

                await trackMixpanelApiService({
                  event: EAnalyticEvents.QR_CREATED,
                  email,
                  userId: generatedUserId,
                  params: {
                    ...trackingParams,
                  },
                });
              })(),
            ]
          : []),

        // Set onboarding step to completed (outside transaction as it's Redis)
        redis.set(`onboarding-step:${generatedUserId}`, "completed"),
        CustomerIOClient.identify(generatedUserId, {
          email,
        }),
        sendEmail({
          email: email,
          subject: "Welcome to GetQR",
          template: CUSTOMER_IO_TEMPLATES.WELCOME_EMAIL,
          messageData: {
            qr_name: qrDataToCreate?.title || "Untitled QR",
            qr_type:
              QR_TYPES.find((item) => item.id === qrDataToCreate?.qrType)!
                .label || "Indefined type",
            url: HOME_DOMAIN,
          },
          customerId: generatedUserId,
        }),
      ]),
    );

    return {
      user: createdUser,
      workspace: workspaceResponse,
    };
  });
