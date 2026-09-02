"use server";

import {
  analyzeDubAnalyticsScript,
  toVerifySiteUrl,
  type VerifyInstallationResult,
} from "@/lib/analytics/verify-installation";
import { prisma } from "@/lib/prisma";
import { ratelimit } from "@/lib/upstash";
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
      requiredPermissions: ["workspaces.write"],
    });

    const { success } = await ratelimit(5, "1 m").limit(
      `verify-workspace-setup:${workspace.id}`,
    );

    if (!success) {
      throw new Error(
        "Too many verification attempts. Please try again in a minute.",
      );
    }

    const hostnames = (workspace.allowedHostnames as string[]) || [];

    if (!hostnames.includes(hostname)) {
      throw new Error("Select a hostname from your allowlist.");
    }

    if (hostname.startsWith("*.")) {
      return {
        status: "error",
        hostname,
        error: "unsupported",
      };
    }

    const firecrawl = new FirecrawlApp({
      apiKey: process.env.FIRECRAWL_API_KEY,
    });

    const scrapeResult = await firecrawl.scrapeUrl(toVerifySiteUrl(hostname), {
      formats: ["rawHtml"],
      onlyMainContent: false,
      parsePDF: false,
      maxAge: 0,
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

    const latest = await prisma.project.findUnique({
      where: { id: workspace.id },
      select: { store: true },
    });
    const store = (latest?.store as Record<string, unknown> | null) ?? {};

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
