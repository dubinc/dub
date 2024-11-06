import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

async function main() {
  // const partner = await prisma.partner.create({
  //   data: {
  //     name: "Kiran",
  //   },
  // });

  // console.log("Partner created", partner);

  const program = await prisma.program.create({
    data: {
      name: "Supabase",
      slug: "supabase",
      workspaceId: "cl7pj5kq4006835rbjlt2ofka",
    },
  });

  console.log("Program created", program);

  const programEnrollment = await prisma.programEnrollment.create({
    data: {
      programId: program.id,
      partnerId: "cm2uguc5l0000wq7ryfsa148r",
      linkId: "cm2q86tm4000hgopgg0b54jfi",
    },
  });

  console.log("Program enrollment created", programEnrollment);
}

main();
