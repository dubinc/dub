import { prisma } from "@/lib/prisma";
import { dubLinksMetadataSchema } from "@/lib/tinybird";
import "dotenv-flow/config";

const enrollmentIds = [
  // "cm2v7e3780000d1efwh8b63y5",
  // "cm355n83o0000otvprah7scos",
  // "cm357actq0001otvpagdxa4r0",
  // "cm3dwzi320000gm2q3h5382w9",
  // "cm3fb79kn0000krzb1wms0818",
  // "cm3ghlajq00002tvj5b72vvgj",
  // "cm3ghqh1300012tvjbeyeo5ec",
  // "cm3gofygs000011simcw9kcqd",
  "cm3goiy8q0000rcpha96y0vhj",
];

async function main() {
  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      id: {
        in: enrollmentIds,
      },
    },
    select: {
      programId: true,
      link: {
        select: {
          id: true,
          domain: true,
          key: true,
          url: true,
          projectId: true,
          createdAt: true,
          tags: true,
        },
      },
    },
  });

  const linksMetadata = programEnrollments.map((programEnrollment) => {
    if (!programEnrollment?.link) {
      throw new Error("Link not found");
    }

    const link = programEnrollment.link;

    return dubLinksMetadataSchema.parse({
      link_id: link.id,
      domain: link.domain,
      key: link.key,
      url: link.url,
      tag_ids: link.tags.map((t) => t.id) || [],
      program_id: programEnrollment.programId,
      workspace_id: link.projectId,
      created_at: link.createdAt,
      deleted: false,
    });
  });

  console.log(linksMetadata);

  const response = await fetch(
    `https://api.us-east.tinybird.co/v0/events?name=dub_links_metadata`,
    {
      headers: {
        Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
      },
      method: "POST",
      body: linksMetadata.map((e) => JSON.stringify(e) + "\n").join(""),
    },
  ).then((r) => r.json());

  console.log(response);
}

main();
