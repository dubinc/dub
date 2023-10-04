import { withProjectAuth } from "#/lib/auth";
import prisma from "#/lib/prisma";

export default withProjectAuth(async (req, res) => {
  const { id } = req.query as { id: string };
  // PUT /api/projects/[slug]/tags/[id] – update a tag for a project
  if (req.method === "PUT") {
    const { name, color } = req.body;
    const response = await prisma.tag.update({
      where: {
        id,
      },
      data: {
        name,
        color,
      },
    });
    return res.status(200).json(response);

    // DELETE /api/projects/[slug]/tags/[id] – delete a tag for a project
  } else if (req.method === "DELETE") {
    const response = await prisma.tag.delete({
      where: {
        id,
      },
    });
    return res.status(200).json(response);
  } else {
    res.setHeader("Allow", ["PUT", "DELETE"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
});
