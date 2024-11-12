import { prisma } from "@/lib/prisma";
import { dubLinksMetadataSchema } from "@/lib/tinybird";
import "dotenv-flow/config";

const partnerId = "pn_DlsZeePb38RVcnrfbD0SrKzB";
const programId = "prog_d8pl69xXCv4AoHNT281pHQdo";

async function main() {
  const programEnrollment = await prisma.programEnrollment.findUnique({
    where: {
      partnerId_programId: {
        partnerId,
        programId,
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
  if (!programEnrollment?.link) {
    throw new Error("Link not found");
  }

  const link = programEnrollment.link;

  const linksMetadata = [
    dubLinksMetadataSchema.parse({
      link_id: link.id,
      domain: link.domain,
      key: link.key,
      url: link.url,
      tag_ids: link.tags.map((t) => t.id) || [],
      program_id: programEnrollment.programId,
      workspace_id: link.projectId,
      created_at: link.createdAt,
      deleted: false,
    }),
  ];

  console.log(linksMetadata);

  // const response = await fetch(
  //   `https://api.us-east.tinybird.co/v0/events?name=dub_links_metadata`,
  //   {
  //     headers: {
  //       Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
  //     },
  //     method: "POST",
  //     body: linksMetadata.map((e) => JSON.stringify(e) + "\n").join(""),
  //   },
  // ).then((r) => r.json());

  // console.log(response);
}

main();
