import "dotenv-flow/config";

import { createSandboxWorkspace } from "@/lib/sandbox/create-sandbox-workspace";

async function main() {
  await createSandboxWorkspace({
    workspace: {
      name: "Acme",
      slug: "acme",
      plan: "business",
    },
    users: [
      {
        email: "owner@dub-internal-test.com",
        role: "owner",
      },
    ],
  });
}

main();
