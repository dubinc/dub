import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";

const emails: string[] = [];

async function main() {
  Papa.parse(fs.createReadStream("unsubscribed.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: { data: { email: string } }) => {
      emails.push(result.data.email);
    },
    complete: async () => {
      console.log(emails.length);

      const response = await prisma.user.updateMany({
        where: {
          email: {
            in: emails,
          },
        },
        data: {
          subscribed: false,
        },
      });

      console.log(response);
    },
  });
}

main();
