import { withProjectAuth } from "#/lib/auth";
import prisma from "#/lib/prisma";
import { nanoid } from "#/lib/utils";
import { put } from "@vercel/blob";

export default withProjectAuth(async (req, res, project) => {
  // POST /api/projects/[slug]/logo – upload a new logo
  if (req.method === "POST") {
    const file = req.body as File;
    if (!file) {
      return res.status(400).end("Missing file");
    }
    const contentType = req.headers["content-type"] || "text/plain";
    const filename = `${nanoid()}.${contentType.split("/")[1]}`;
    console.log({ filename, contentType });

    const { url } = await put(filename, file, {
      access: "public",
    });

    const response = await prisma.project.update({
      where: { id: project.id },
      data: { logo: url },
    });

    return res.status(200).json(response);
  } else {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
});
