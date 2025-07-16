"use server";

import { WorkspaceProps } from "@/lib/types.ts";
import { ratelimit } from "@/lib/upstash";
import { createWorkspaceForUser } from "@/lib/utils/create-workspace";
import { CUSTOMER_IO_TEMPLATES, sendEmail } from "@dub/email";
import { prisma } from "@dub/prisma";
import { HOME_DOMAIN, R2_URL } from "@dub/utils";
import { CustomerIOClient } from "core/lib/customerio/customerio.config.ts";
import { getUserCookieService } from "core/services/cookie/user-session.service.ts";
import { flattenValidationErrors } from "next-safe-action";
import { createQrWithLinkUniversal } from "../api/qrs/create-qr-with-link-universal";
import { createId, getIP } from "../api/utils";
import { hashPassword } from "../auth/password";
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

    // ToDo: add to prisma tx
    await prisma.emailVerificationToken.delete({
      where: {
        identifier: email,
        token: code,
      },
    });

    // ToDo: replace user creation
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });
    // ToDo: add to prisma tx

    if (user) {
      throw new Error("User with this email already exists");
    }

    const { sessionId } = await getUserCookieService();
    const generatedUserId = sessionId ?? createId({ prefix: "user_" });

    const createdAt = new Date();
    const trialEndsAt = new Date(createdAt);
    trialEndsAt.setDate(trialEndsAt.getDate() + 10);

    console.log('generatedUserId', generatedUserId);
    console.log(qrDataToCreate);

    try {
      await prisma.user.create({
        data: {
          id: generatedUserId,
          email,
          passwordHash: await hashPassword(password),
          emailVerified: new Date(),
          trialEndsAt,
        },
      });
    } catch (error) {
      console.error('Error creating user', error);
      throw new Error('Failed to create user');
    }

    console.log('here');

    // @CUSTOM_FEATURE: creation of a workspace immediately after registration to skip onboarding
    const workspaceResponse = await createWorkspaceForUser({
      prismaClient: prisma,
      userId: generatedUserId,
      email,
    });

    if (qrDataToCreate) {
      const linkUrl = qrDataToCreate?.fileId
        ? `${R2_URL}/qrs-content/${qrDataToCreate.fileId}`
        : (qrDataToCreate!.styles!.data! as string);

      const { createdQr } = await createQrWithLinkUniversal({
        qrData: {
          data: qrDataToCreate.styles.data as string,
          qrType: qrDataToCreate.qrType as any,
          title: qrDataToCreate.title,
          description: undefined,
          styles: qrDataToCreate.styles,
          frameOptions: qrDataToCreate.frameOptions,
          fileId: qrDataToCreate.fileId,
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

      CustomerIOClient.identify(generatedUserId, {
        email,
      }).finally();

      sendEmail({
        email: email,
        subject: "Welcome to GetQR",
        template: CUSTOMER_IO_TEMPLATES.WELCOME_EMAIL,
        messageData: {
          qr_name: createdQr.title || "Untitled QR",
          qr_type: createdQr.qrType,
          url: HOME_DOMAIN,
        },
        customerId: generatedUserId,
      }).finally();
    }
  });
