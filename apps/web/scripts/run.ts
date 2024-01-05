// runner.ts
import { exec } from "child_process";

const command: string = process.argv[2];

if (!command) {
  console.error("Please provide a command name.");
  process.exit(1);
}

const scriptPath = `./scripts/${command}.${
  command === "send-emails" ? "tsx" : "ts"
}`;

exec(
  `tsx  --stack-size=5120000 ${scriptPath}`,
  { maxBuffer: 1024 * 5000 },
  (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing script: ${error.message}`);
      return;
    }
    console.log(stdout);
    console.error(stderr);
  },
);
