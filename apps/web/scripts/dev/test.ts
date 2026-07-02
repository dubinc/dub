import { createSandboxWorkspace } from "@/lib/sandbox/create-sandbox-workspace";
import "dotenv-flow/config";

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
