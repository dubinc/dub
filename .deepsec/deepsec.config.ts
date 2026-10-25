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
        "app/api/oauth/",
        "app/(ee)/api/cron/",
      ],
      promptAppend:
        "Focus on IDOR/tenant isolation, authz gaps, SSRF, XSS, and billing bugs. Ignore style and tests.",
    },
  ],
});
