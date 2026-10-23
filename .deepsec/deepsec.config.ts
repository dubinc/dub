import { defineConfig } from "deepsec/config";

export default defineConfig({
  ai: { mode: "gateway", provider: "vercel" },
  defaultAgent: "codex",
  projects: [
    {
      id: "web",
      root: "../apps/web",
      githubUrl: "https://github.com/dubinc/dub/blob/main/apps/web",
      priorityPaths: [
        "lib/auth/",
        "app/api/",
        "app/(ee)/api/payouts/",
        "app/(ee)/api/partners/",
        "app/(ee)/api/admin/",
        "app/(ee)/api/oauth/",
        "app/(ee)/api/cron/",
      ],
      promptAppend:
        "Focus on IDOR/tenant isolation, authz gaps, SSRF, XSS, and payout/money-movement bugs. Ignore style and tests.",
    },
  ],
});
