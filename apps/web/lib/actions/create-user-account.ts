"use server";

import { WorkspaceProps } from "@/lib/types.ts";
import { ratelimit } from "@/lib/upstash";
import { createWorkspaceForUser } from "@/lib/utils/create-workspace";
import { CUSTOMER_IO_TEMPLATES, sendEmail } from "@dub/email";
import { prisma } from "@dub/prisma";
import { HOME_DOMAIN, R2_URL } from "@dub/utils";
import { TrackClient } from "customerio-node";
import { flattenValidationErrors } from "next-safe-action";
import { createQrWithLinkUniversal } from "../api/qrs/create-qr-with-link-universal";
import { createId, getIP } from "../api/utils";
import { hashPassword } from "../auth/password";
import z from "../zod";
import { signUpSchema } from "../zod/schemas/auth";
import { throwIfAuthenticated } from "./auth/throw-if-authenticated";
import { actionClient } from "./safe-action";

let cio = new TrackClient(
  process.env.CUSTOMER_IO_SITE_ID!,
  process.env.CUSTOMER_IO_TRACK_API_KEY!,
);

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
  file: z.string().nullish().describe("The file ID for the uploaded content"),
  fileName: z
    .string()
    .nullish()
    .describe("The original name of the uploaded file"),
  fileSize: z
    .number()
    .nullish()
    .describe("The original size of the uploaded file"),
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

    await prisma.emailVerificationToken.delete({
      where: {
        identifier: email,
        token: code,
      },
    });

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      const generatedUserId = createId({ prefix: "user_" });
      const createdAt = new Date();
      const trialEndsAt = new Date(createdAt);
      trialEndsAt.setDate(trialEndsAt.getDate() + 10);

      await prisma.user.create({
        data: {
          id: generatedUserId,
          email,
          passwordHash: await hashPassword(password),
          emailVerified: new Date(),
          trialEndsAt,
        },
      });

      // @CUSTOM_FEATURE: creation of a workspace immediately after registration to skip onboarding
      const workspaceResponse = await createWorkspaceForUser({
        prismaClient: prisma,
        userId: generatedUserId,
        email,
      });

      if (qrDataToCreate) {
        const linkUrl = qrDataToCreate?.file
          ? `${R2_URL}/qrs-content/${qrDataToCreate.file}`
          : (qrDataToCreate!.styles!.data! as string);

        const { createdQr } = await createQrWithLinkUniversal({
          qrData: {
            data: qrDataToCreate.styles.data as string,
            qrType: qrDataToCreate.qrType as any,
            title: qrDataToCreate.title,
            description: undefined,
            styles: qrDataToCreate.styles,
            frameOptions: qrDataToCreate.frameOptions,
            file: qrDataToCreate.file,
            fileName: qrDataToCreate.fileName,
            fileSize: qrDataToCreate.fileSize,
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
          fileId: qrDataToCreate.file || undefined,
          homePageDemo: true,
        });

        await cio.identify(generatedUserId, {
          email: email,
        });

        await sendEmail({
          email: email,
          subject: "Welcome to GetQR",
          template: CUSTOMER_IO_TEMPLATES.WELCOME_EMAIL,
          messageData: {
            qr_name: createdQr.title || "Untitled QR",
            qr_type: createdQr.qrType,
            url: HOME_DOMAIN,
          },
          customerId: generatedUserId,
        });
      }
    }
  });
