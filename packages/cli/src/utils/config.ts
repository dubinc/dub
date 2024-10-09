import type { DubConfig } from "@/types";
import { oauthClient } from "@/utils/oauth";
import Configstore from "configstore";

export async function getConfig(): Promise<DubConfig> {
  const configStore = new Configstore("dub-cli");

  if (!configStore.size) {
    throw new Error(
      "Access token not found. Please run `dub login` to log into the Dub platform.",
    );
  }

  const config = configStore.all as DubConfig;

  if (config.expires_at && Date.now() >= config.expires_at) {
    const { accessToken, refreshToken, expiresAt } =
      await oauthClient.refreshToken({
        accessToken: config.access_token,
        refreshToken: config.refresh_token,
        expiresAt: config.expires_at,
      });

    const updatedConfig = await setConfig({
      access_token: accessToken.trim(),
      refresh_token: refreshToken,
      expires_at: expiresAt ? Date.now() + expiresAt * 1000 : null,
    });

    return updatedConfig;
  }

  return await configStore.all;
}

export async function setConfig(
  newConfig: Partial<DubConfig>,
): Promise<DubConfig> {
  const configStore = new Configstore("dub-cli");
  const existingConfig: DubConfig = configStore.all;

  const updatedConfig: DubConfig = {
    ...existingConfig,
    ...newConfig,
  };

  configStore.set(updatedConfig);

  if (!configStore.path) {
    throw new Error("Failed to create or update config file");
  }

  return updatedConfig;
}
