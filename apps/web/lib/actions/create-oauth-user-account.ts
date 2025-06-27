"use server";

import { DubApiError, ErrorCodes } from "@/lib/api/errors.ts";
import { createLink, processLink } from "@/lib/api/links";
import { createQr } from "@/lib/api/qrs/create-qr.ts";
import { WorkspaceProps } from "@/lib/types.ts";
import { createWorkspaceForUser } from "@/lib/utils/create-workspace";
import { prisma } from "@dub/prisma";
import { R2_URL } from "@dub/utils";
import { createId } from "../api/utils";
import z from "../zod";
import { actionClient } from "./safe-action";

const qrDataToCreateSchema = z.object({
  title: z.string(),
  styles: z.object({}).passthrough(),
  frameOptions: z.object({
    id: z.string(),
    color: z.string().optional(),
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

const schema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  image: z.string().optional(),
  qrDataToCreate: qrDataToCreateSchema.nullish(),
});

// Create user account for OAuth registration
export const createOAuthUserAccountAction = actionClient
  .schema(schema)
  .action(async ({ parsedInput }) => {
    const { email, name, image, qrDataToCreate } = parsedInput;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      throw new Error("User already exists");
    }

    const generatedUserId = createId({ prefix: "user_" });

    // Create user
    await prisma.user.create({
      data: {
        id: generatedUserId,
        email,
        name,
        image,
        emailVerified: new Date(),
      },
    });

    // Create workspace
    const workspaceResponse = await createWorkspaceForUser({
      prismaClient: prisma,
      userId: generatedUserId,
      email,
    });

    // Create QR code if provided
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
        );
      } catch (error) {
        throw new DubApiError({
          code: "unprocessable_entity",
          message: error.message,
        });
      }
    }

    return { userId: generatedUserId, workspaceSlug: workspaceResponse.slug };
  });
