import { hashStringSHA256 } from "@dub/utils";

async function main() {
  const text =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.";
  console.time("hash");
  const hash = await hashStringSHA256(text);
  console.timeEnd("hash");
  console.log(hash);
}

main();
