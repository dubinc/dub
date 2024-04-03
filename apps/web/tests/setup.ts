import prisma from "@/lib/prisma";
import { beforeAll } from "vitest";

beforeAll(() => {
  console.log("Running beforeAll");
  console.log("Running beforeAll");
  console.log("Running beforeAll");
  console.log("Running beforeAll");
  console.log("Running beforeAll");
  console.log("Running beforeAll");
  // await prisma.$transaction([
  //   prisma.project.deleteMany(),
  //   prisma.token.deleteMany(),
  //   prisma.user.deleteMany(),
  // ]);

  // await prisma.$disconnect()
});
