import { prisma } from "@/lib/prisma";
import { dubLinksMetadataSchema } from "@/lib/tinybird";
import "dotenv-flow/config";

async function main() {
  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      linkId: {
        not: null,
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

  const linksMetadata = programEnrollments.map((e) => ({
    ...dubLinksMetadataSchema.parse({
      link_id: e.link?.id,
      domain: e.link?.domain,
      key: e.link?.key,
      url: e.link?.url,
      tag_ids: e.link?.tags.map((t) => t.id) || [],
      workspace_id: e.link?.projectId,
      created_at: e.link?.createdAt,
      deleted: false,
    }),
    program_id: e.programId,
  }));

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
  // );

  // console.log(response);
}

main();
