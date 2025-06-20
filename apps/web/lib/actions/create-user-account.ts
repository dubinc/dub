"use server";

import { DubApiError, ErrorCodes } from "@/lib/api/errors.ts";
import { createLink, processLink } from "@/lib/api/links";
import { createQr } from "@/lib/api/qrs/create-qr.ts";
import { WorkspaceProps } from "@/lib/types.ts";
import { ratelimit, redis } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { generateRandomString, R2_URL } from "@dub/utils";
import slugify from "@sindresorhus/slugify";
import { nanoid } from "nanoid";
import { flattenValidationErrors } from "next-safe-action";
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
  thumbnailFileId: z
    .string()
    .nullish()
    .describe("The thumbnail file ID for the uploaded content"),
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

      await prisma.user.create({
        data: {
          id: generatedUserId,
          email,
          passwordHash: await hashPassword(password),
          emailVerified: new Date(),
        },
      });

      // @CUSTOM_FEATURE: creation of a workspace immediately after registration to skip onboarding
      const workspaceResponse = await prisma.project.create({
        data: {
          name: email,
          slug: slugify(email),
          users: {
            create: {
              userId: generatedUserId,
              role: "owner",
              notificationPreference: {
                create: {},
              },
            },
          },
          billingCycleStart: new Date().getDate(),
          invoicePrefix: generateRandomString(8),
          inviteCode: nanoid(24),
          defaultDomains: {
            create: {},
          },
        },
        include: {
          users: {
            where: {
              userId: generatedUserId,
            },
            select: {
              role: true,
            },
          },
          domains: {
            select: {
              slug: true,
              primary: true,
            },
          },
        },
      });

      await prisma.user.update({
        where: {
          id: generatedUserId,
        },
        data: {
          defaultWorkspace: workspaceResponse.slug,
        },
      });

      if (qrDataToCreate !== null) {
        const { link, error, code } = await processLink({
          payload: {
            url: qrDataToCreate?.file
              ? `${R2_URL}/qrs-content/${qrDataToCreate.file}`
              : (qrDataToCreate!.styles!.data! as string),
          },
          workspace: workspaceResponse as Pick<
            WorkspaceProps,
            "id" | "plan" | "flags"
          >,
          userId: generatedUserId,
        });

        if (error != null) {
          throw new DubApiError({
            code: code as ErrorCodes,
            message: error,
          });
        }

        try {
          const createdLink = await createLink(link);

          await createQr(
            {
              ...qrDataToCreate,
              // @ts-ignore
              link: createdLink,
              // @ts-ignore
              data: qrDataToCreate.styles.data,
              fileName: qrDataToCreate?.fileName,
              fileSize: qrDataToCreate?.fileSize,
            },
            createdLink.shortLink,
            createdLink.id,
            createdLink.userId,
            qrDataToCreate?.file,
            true,
            qrDataToCreate?.thumbnailFileId,
          );
        } catch (error) {
          throw new DubApiError({
            code: "unprocessable_entity",
            message: error.message,
          });
        }
      }

      await redis.set(`onboarding-step:${generatedUserId}`, "completed");
    }
  });
