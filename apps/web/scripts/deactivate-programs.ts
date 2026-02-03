import "dotenv-flow/config";

import { deactivateProgram } from "@/lib/api/programs/deactivate-program";

async function main() {
  const programId = "prog_...";

  await deactivateProgram(programId);
}

main();
