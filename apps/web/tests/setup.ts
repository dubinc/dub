
import prisma from "@/lib/prisma";
import { afterAll, beforeAll } from "vitest";

beforeAll(async () => {
  console.log("Running beforeAll")

  // await prisma.user.create({
  //   data: {
  //     name: "Kiran",
  //     email: "kiran+1@dub.co",
  //     emailVerified: new Date(),
  //   },
  // });

  // Create a user
  // Create a workspace
  // Create a api key
});

afterAll(async () => {
  console.log("Running afterAll")
  await prisma.$transaction([prisma.project.deleteMany()]);
  await prisma.$transaction([prisma.user.deleteMany()]);
})