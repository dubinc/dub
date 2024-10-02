import { logger } from "@/utils/logger"
import { z } from "zod"

export function handleError(error: unknown) {
  if (error instanceof z.ZodError) {
    error.issues.forEach((issue) => {
      logger.error(issue.message)
    })

    process.exit(1)
  }

  if (typeof error === "string") {
    logger.error(error)
    process.exit(1)
  }

  if (error instanceof Error) {
    logger.error(error.message)
    process.exit(1)
  }

  logger.error("Something went wrong. Please try again.")
  process.exit(1)
}
