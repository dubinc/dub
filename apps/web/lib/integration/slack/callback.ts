// import { withSession } from "@/lib/auth";
// import { installIntegration } from "@/lib/integration/install";
// import { prisma } from "@/lib/prisma";
// import { redis } from "@/lib/upstash";
// import z from "@/lib/zod";
// import { APP_DOMAIN, getSearchParams } from "@dub/utils";
// import { redirect } from "next/navigation";

// const schema = z.object({
//   command: z.enum(["/shorten"]),
//   response_url: z.string().url(),
//   text: z.string().transform((text) => text.trim().split(" ").filter(Boolean)),
//   token: z.string(),
// });

// // POST /api/slack/callback – receive the message from the Slack
// export const POST = async (req: NextRequest) => {
//   // TODO:
//   // Verify X-Slack-Signature

//   const formData = await req.formData();
//   const rawFormData = Object.fromEntries(formData.entries());
//   const parsedInput = schema.safeParse(rawFormData);

//   if (!parsedInput.success) {
//     return new Response("Invalid request", {
//       status: 400,
//     });
//   }

//   const { command, response_url, text, token } = parsedInput.data; 

//   return new Response("OK");
// };

// export const handleSlackCallback = async (req: Request) => {
//   //
// }