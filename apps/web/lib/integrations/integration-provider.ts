import { prisma } from "@/lib/prisma";
import { InstalledIntegration, Prisma } from "@prisma/client";

export type InstallationContext = Pick<
  InstalledIntegration,
  "id" | "credentials" | "settings"
>;

export abstract class IntegrationProvider<TCredentials, TSettings> {
  abstract assertEnv(): void;

  abstract parseCredentials(raw: unknown): TCredentials;

  abstract serializeCredentials(
    credentials: Partial<TCredentials>,
  ): Prisma.InputJsonValue;

  getCredentials(installation: InstallationContext): TCredentials {
    return this.parseCredentials(installation.credentials);
  }

  abstract parseSettings(raw: unknown): TSettings;

  getSettings(installation: InstallationContext): TSettings {
    return this.parseSettings(installation.settings);
  }

  async updateInstallation(
    installation: Pick<InstallationContext, "id">,
    data: {
      credentials?: Prisma.InputJsonValue;
      settings?: TSettings;
    },
  ) {
    await prisma.installedIntegration.update({
      where: {
        id: installation.id,
      },
      data: {
        ...(data.credentials !== undefined
          ? { credentials: data.credentials }
          : {}),
        ...(data.settings !== undefined
          ? { settings: data.settings as Prisma.InputJsonValue }
          : {}),
      },
    });
  }

  async install(_args: unknown): Promise<void> {
    // no-op — overridden per integration
  }

  async uninstall(_installation: InstallationContext): Promise<void> {
    // no-op — overridden per integration
  }
}
