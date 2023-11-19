import "dotenv-flow/config";
import prisma from "@/lib/prisma";
import fs from "fs";

async function main() {
  const unsubscribedUsers = await fetch(
    `https://api.resend.com/audiences/${process.env.RESEND_AUDIENCE_ID}/contacts`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
    },
  ).then((res) => res.json());

  const unsubscribedUserEmails = unsubscribedUsers.data.map(
    (user) => user.email,
  );

  const users = await prisma.user.findMany({
    select: {
      email: true,
      name: true,
      createdAt: true,
    },
    where: {
      email: {
        notIn: unsubscribedUserEmails,
      },
    },
  });
  const processedUsers = users.map(({ email, name, createdAt }) => ({
    email,
    firstName: name?.split(" ")[0] || "",
    lastName: name?.split(" ")[1] || "",
    createdAt: createdAt.toISOString(),
  }));

  //   write to csv file, with headers
  const csv = [
    ["Email", "First Name", "Last Name", "Joined"].join(","),
    ...processedUsers.map(({ email, firstName, lastName, createdAt }) =>
      [email, firstName, lastName, createdAt].join(","),
    ),
  ].join("\n");
  fs.writeFileSync("users.csv", csv);
}

main();
