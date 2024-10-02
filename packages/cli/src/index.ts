#!/usr/bin/env node

import { config } from "@/commands/config"
import { domain } from "@/commands/domain"
import { link } from "@/commands/link"
import { login } from "@/commands/login"
import { getPackageInfo } from "@/utils/get-package-info"
import { Command } from "commander"

process.on("SIGINT", () => process.exit(0))
process.on("SIGTERM", () => process.exit(0))

async function main() {
  const packageInfo = await getPackageInfo()

  const program = new Command()
    .name("dub")
    .description("a cli for shortening url")
    .version(
      packageInfo.version || "1.0.0",
      "-v, --version",
      "display the version number"
    )

  program
    .addCommand(login)
    .addCommand(config)
    .addCommand(domain)
    .addCommand(link)

  program.parse()
}

main()
