import type { DubConfig } from "@/types";
import Configstore from "configstore";

export async function getConfig(): Promise<DubConfig> {
  const getConfig = new Configstore("dub-cli");

  if (!getConfig.size) {
    throw new Error(
      "Access token not found. Please run `dub login` to log into the Dub platform.",
    );
  }

  return await getConfig.all;
}
