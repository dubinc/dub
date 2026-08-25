"use server";

import {
  analyzeDubAnalyticsScript,
  toVerifySiteUrl,
  type VerifyInstallationResult,
} from "@/lib/analytics/verify-installation";
import { prisma } from "@/lib/prisma";
import FirecrawlApp from "@mendable/firecrawl-js";
import * as z from "zod/v4";
import { authActionClient } from "./safe-action";
import { throwIfNoPermission } from "./throw-if-no-permission";

const schema = z.object({
  workspaceId: z.string(),
  hostname: z.string().min(1),
});

export const verifyWorkspaceSetup = authActionClient
  .inputSchema(schema)
  .action(async ({ ctx, parsedInput }): Promise<VerifyInstallationResult> => {
    const { workspace, user } = ctx;
    const { hostname } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredPermissions: ["workspaces.read"],
    });

    const hostnames = (workspace.allowedHostnames as string[]) || [];

    if (!hostnames.includes(hostname)) {
      throw new Error("Select a hostname from your allowlist.");
    }

    if (hostname.startsWith("*.")) {
      return {
        status: "error",
        hostname,
        error: "unreachable",
      };
    }

    const firecrawl = new FirecrawlApp({
      apiKey: process.env.FIRECRAWL_API_KEY,
    });

    const scrapeResult = await firecrawl.scrapeUrl(toVerifySiteUrl(hostname), {
      formats: ["rawHtml"],
      onlyMainContent: false,
      parsePDF: false,
      includeTags: ["head"],
      maxAge: 14400000,
      waitFor: 5000,
    });

    if (!scrapeResult.success || !scrapeResult.rawHtml) {
      return {
        status: "error",
        hostname,
        error: "unreachable",
      };
    }

    const analysis = analyzeDubAnalyticsScript(scrapeResult.rawHtml);

    if (analysis !== "ok") {
      return {
        status: "error",
        hostname,
        error: analysis,
      };
    }

    const verifiedAt = new Date().toISOString();
    const verifiedUser = {
      id: user.id,
      name: user.name ?? user.email ?? "Unknown",
      image: user.image ?? null,
    };

    const store = (workspace.store as Record<string, unknown> | null) ?? {};

    await prisma.project.update({
      where: { id: workspace.id },
      data: {
        store: {
          ...store,
          analyticsSettingsInstallationVerified: {
            hostname,
            verifiedAt,
            user: verifiedUser,
          },
        },
      },
    });

    return {
      status: "success",
      hostname,
      verifiedAt,
      user: verifiedUser,
    };
  });
