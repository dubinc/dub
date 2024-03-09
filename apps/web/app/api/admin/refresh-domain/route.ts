import { addDomainToVercel } from "@/lib/api/domains";
import { withAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

// POST /api/admin/refresh-domain
export const POST = withAdmin(async ({ req }) => {
  const { domain } = await req.json();

  const remove = await fetch(
    `https://api.vercel.com/v9/projects/${process.env.PROJECT_ID_VERCEL}/domains/${domain}?teamId=${process.env.TEAM_ID_VERCEL}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN}`,
      },
      method: "DELETE",
    },
  ).then((res) => res.json());
  const add = await addDomainToVercel(domain);

  console.log({ remove, add });

  return NextResponse.json({ success: true });
});
