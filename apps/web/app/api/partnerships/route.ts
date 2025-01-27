import { DubApiError } from "@/lib/api/errors";
import { createLink } from "@/lib/api/links";
import { enrollPartner } from "@/lib/api/partners/enroll-partner";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { checkIfKeyExists } from "@/lib/planetscale";
import { createPartnerSchema } from "@/lib/zod/schemas/partners";
import { NextResponse } from "next/server";

export const POST = withWorkspace(async ({ workspace, req }) => {
  const { programId, name, email, image, username } = createPartnerSchema.parse(
    await req.json(),
  );

  const program = await getProgramOrThrow({
    workspaceId: workspace.id,
    programId,
  });

  if (!program.domain || !program.url) {
    throw new DubApiError({
      code: "unprocessable_entity",
      message: "Program domain and url are required",
    });
  }

  const linkExists = await checkIfKeyExists(program.domain, username);

  if (linkExists) {
    throw new DubApiError({
      code: "conflict",
      message: "This username is already in use. Choose a different one.",
    });
  }

  const link = await createLink({
    projectId: workspace.id,
    domain: program.domain,
    key: username,
    url: program.url,
    programId,
    trackConversion: true,
  });

  const createdPartner = await enrollPartner({
    programId,
    linkId: link.id,
    partner: {
      name,
      email,
      image,
    },
  });

  return NextResponse.json(createdPartner);
});
