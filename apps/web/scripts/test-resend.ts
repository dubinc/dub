import { sendBatchEmail } from "@dub/email";
import "dotenv-flow/config";

async function main() {
  const response = await sendBatchEmail([
    {
      to: "kiran+1@dub.co",
      subject: "Test 3",
      text: "Test 3",
      from: "hello@devkiran.site",
      headers: {
        "Idempotency-Key": "test-2",
      },
    },
    {
      to: "kiran+2@dub.co",
      subject: "Test 3",
      text: "Test 3",
      from: "hello@devkiran.site",
      headers: {
        "Idempotency-Key": "test-2",
      },
    },
  ]);
}

main();
