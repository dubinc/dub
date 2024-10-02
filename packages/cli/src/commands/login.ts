import type { DubConfig } from "@/types"
import { handleError } from "@/utils/handle-error"
import { logger } from "@/utils/logger"
import chalk from "chalk"
import { Command } from "commander"
import Configstore from "configstore"
import ora from "ora"
import prompts from "prompts"
import { z } from "zod"

const loginOptionsSchema = z.object({
  key: z.string().min(8, { message: "Please use a valid workspace API key" })
})

export const login = new Command()
  .name("login")
  .description("Configure your workspace key")
  .argument("[key]", "Workspace API key for authentication")
  .action(async (key) => {
    try {
      let credentials = { key }

      if (!credentials.key) {
        credentials = await prompts(
          [
            {
              type: "text",
              name: "key",
              message: "Enter your workspace API key:",
              validate: (value) => {
                const result = loginOptionsSchema.shape.key.safeParse(value)
                return result.success || result.error.errors[0].message
              }
            }
          ],
          {
            onCancel: () => {
              logger.info("")
              logger.warn("You cancelled the prompt.")
              logger.info("")
              process.exit(0)
            }
          }
        )
      }

      const validatedData = loginOptionsSchema.parse(credentials)

      const spinner = ora("configuring workspace key").start()

      const configInfo: DubConfig = {
        key: validatedData.key.trim(),
        domain: "dub.sh"
      }

      const config = new Configstore("dubcli")
      config.set(configInfo)

      if (!config.path) {
        handleError(new Error("Failed to create config file"))
      }

      spinner.succeed("Done")

      logger.info("")
      logger.info(
        `${chalk.green("Success!")} Workspace API key configured successfully.`
      )
      logger.info("")
    } catch (error) {
      handleError(error)
    }
  })
