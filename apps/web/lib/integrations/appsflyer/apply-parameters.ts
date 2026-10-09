import {
  PartnerMacroContext,
  resolvePartnerMacros,
} from "@/lib/partners/macros";
import { prisma } from "@/lib/prisma";
import { APPSFLYER_INTEGRATION_ID } from "@dub/utils";
import { AppsFlyerSettings, appsFlyerSettingsSchema } from "./schema";

// Resolve macros in parameter values and append them to a URL
export function applyAppsFlyerParameters({
  url,
  parameters,
  context,
}: {
  url: string;
  parameters: { key: string; value: string }[];
  context: PartnerMacroContext;
}) {
  const urlObj = new URL(url);

  for (const { key, value } of parameters) {
    urlObj.searchParams.set(key, resolvePartnerMacros(value, context));
  }

  return urlObj.toString();
}

// Load AppsFlyer parameters from the workspace's installed integration settings
export async function loadAppsFlyerParameters(
  workspaceId: string,
): Promise<AppsFlyerSettings["parameters"]> {
  const installedIntegration = await prisma.installedIntegration.findFirst({
    where: {
      projectId: workspaceId,
      integrationId: APPSFLYER_INTEGRATION_ID,
    },
    select: {
      settings: true,
    },
  });

  if (!installedIntegration?.settings) {
    return [];
  }

  const parsed = appsFlyerSettingsSchema.safeParse(
    installedIntegration.settings,
  );

  if (!parsed.success) {
    return [];
  }

  return [...parsed.data.requiredParameters, ...parsed.data.parameters];
}
