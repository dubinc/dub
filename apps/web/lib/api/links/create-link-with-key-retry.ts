import { getRandomKey } from "@/lib/planetscale";
import { ProcessedLinkProps } from "@/lib/types";
import { Prisma } from "@dub/prisma/client";
import { DubApiError } from "../errors";
import { createLink } from "./create-link";

/**
 * Creates a link with retry functionality for handling P2002 errors (unique constraint violations).
 * If a P2002 error occurs and the key was randomly generated, it will retry with a new random key.
 * If the key was user-specified, it will throw a 409 Conflict error.
 */
export async function createLinkWithKeyRetry({
  link,
  isRandomKey = false,
  maxRetries = 3,
}: {
  link: ProcessedLinkProps;
  isRandomKey?: boolean; // if the key was randomly generated (not specified by the user)
  maxRetries?: number;
}): Promise<ReturnType<typeof createLink>> {
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      return await createLink(link);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        // If the key was specified by the user (not randomly generated), we shouldn't retry
        if (!isRandomKey) {
          throw new DubApiError({
            code: "conflict",
            message: "Duplicate key: This short link already exists.",
          });
        }

        // If we've reached the max retries, throw an error
        if (attempts >= maxRetries - 1) {
          throw new DubApiError({
            code: "conflict",
            message: "Failed to create a unique link after multiple attempts.",
          });
        }

        // Otherwise, generate a new random key and retry
        const newKey = getRandomKey({
          prefix: link["prefix"],
          long: link.domain === "loooooooo.ng",
        });

        link = { ...link, key: newKey };
        attempts++;
      } else {
        throw error;
      }
    }
  }

  // This shouldn't happen due to the while loop condition, but TypeScript requires a return
  throw new Error("Unexpected error in createLinkWithRetry");
}
