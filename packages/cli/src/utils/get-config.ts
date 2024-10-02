import type { DubConfig } from "@/types"
import Configstore from "configstore"

export async function getConfig() {
  const getConfig = new Configstore("dubcli")

  if (!getConfig.size) {
    throw new Error("Missing configuration. Please try to login again.")
  }

  const config = (await getConfig.all) as DubConfig

  return config
}
