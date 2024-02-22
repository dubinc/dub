import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";

let users: { email: string; name?: string }[] = [];

async function main() {
  Papa.parse(fs.createReadStream("all-dub-users.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: { data: any }) => {
      users.push(result.data);
    },
    complete: async () => {
      if (users.length === 0) {
        console.log("No users found");
        return;
      }

      // upload top 95 users
      await Promise.all(users.slice(0, 95).map(({ email, name }) => {}));

      console.log(`Uploaded 95 users, ${users.length - 95} remaining`);

      // write remaining to csv
      fs.writeFileSync("all-dub-users.csv", Papa.unparse(users.slice(95)));
    },
  });
}

main();
