// runner.ts
import { spawn } from "child_process";

const command: string = process.argv[2];

if (!command) {
  console.error("Please provide a command name.");
  process.exit(1);
}

const scriptPath = `./scripts/${command}.${
  command === "send-emails" ? "tsx" : "ts"
}`;

const child = spawn("tsx", ["--stack-size=5120000", scriptPath], {
  stdio: "inherit", // This pipes stdout/stderr directly to the parent process
  shell: true, // Allows running commands as if in a shell
});

child.on("error", (error) => {
  console.error(`Error executing script: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
