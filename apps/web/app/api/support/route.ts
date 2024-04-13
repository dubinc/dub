import { anthropic } from "@/lib/anthropic";
import { withSession } from "@/lib/auth";
import { plain, upsertPlainCustomer } from "@/lib/plain";
import { NextResponse } from "next/server";

export const GET = withSession(async ({ session }) => {
  const res = await upsertPlainCustomer(session);
  return NextResponse.json({
    data: res.data?.customer,
  });
});

// POST /api/support – file a support request
export const POST = withSession(async ({ req, session }) => {
  const { message, attachmentIds } = await req.json();

  let title = "New Support Request";

  try {
    const { content } = await anthropic.messages.create({
      messages: [
        {
          role: "user",
          content: `Create a short but concise title that summarizes the following support request. Only return the generated title, and nothing else.
            
            ${message}`,
        },
      ],
      model: "claude-3-sonnet-20240229",
      max_tokens: 300,
    });
    title = content[0].text;
  } catch (e) {
    console.error("Error generating title:", e);
  }

  const res = await plain.createThread({
    customerIdentifier: {
      externalId: session.user.id,
    },
    title,
    components: [
      {
        componentText: {
          text: message,
        },
      },
    ],
    attachmentIds,
  });

  return NextResponse.json(res);
});
