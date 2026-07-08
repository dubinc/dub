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
        email: "kiran+2@dub.co",
        role: "owner",
      },
    ],
  });
}

main();
