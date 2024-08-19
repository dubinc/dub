import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";
import * as fs from "fs";
import * as Papa from "papaparse";

let emailOpens: string[] = [];

async function main() {
  Papa.parse(fs.createReadStream("email_opens.csv", "utf-8"), {
    header: true,
    skipEmptyLines: true,
    step: (result: {
      data: {
        email_address: string;
      };
    }) => {
      emailOpens.push(result.data.email_address);
    },
  });

  const subscribers = await prisma.user.findMany({
    where: {
      subscribed: true,
    },
    select: {
      email: true,
      name: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const subscribersThatOpenedEmail = subscribers
    // .filter((subscriber) => emailOpens.includes(subscriber.email!))
    .map(({ email, name }) => ({
      email,
      ...(name && {
        firstName: name.split(" ")[0],
        lastName: name.split(" ").slice(1).join(" "),
      }),
    }));

  console.table(subscribersThatOpenedEmail.slice(0, 10));

  fs.writeFileSync(
    "all_email_subscribers.csv",
    Papa.unparse(subscribersThatOpenedEmail),
  );
}

main();
