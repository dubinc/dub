import { DubApiError } from "@/lib/api/errors";
import { createLink } from "@/lib/api/links";
import { enrollPartner } from "@/lib/api/partners/enroll-partner";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { checkIfKeyExists } from "@/lib/planetscale";
import { createPartnerSchema, PartnerSchema } from "@/lib/zod/schemas/partners";
import { NextResponse } from "next/server";

// POST /api/partners - add a partner for a program
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
      code: "bad_request",
      message:
        "You need to set a domain and url for this program before creating a partner.",
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

  return NextResponse.json(PartnerSchema.parse(createdPartner), {
    status: 201,
  });
});
