import { createDotsApp } from "@/lib/dots/create-dots-app";
import "dotenv-flow/config";

async function main() {
  const dotsApp = await createDotsApp({
    workspace: {
      id: "xxx",
      name: "xxx",
    },
  });

  console.log("A Dots app has been created.", dotsApp);
}

main();
