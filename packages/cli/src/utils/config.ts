import type { DubConfig } from "@/types";
import Configstore from "configstore";

export async function getConfig(): Promise<DubConfig> {
  const getConfig = new Configstore("dubcli");

  if (!getConfig.size) {
    throw new Error(
      "Workspace API key not found. Run `dub login` to configure your API key.",
    );
  }

  return await getConfig.all;
}
