import { withUserAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export default withUserAuth(async (req, res, session) => {
  // PUT /api/user – edit a specific user
  if (req.method === "PUT") {
    const { name, email, image } = req.body;
    try {
      const response = await prisma.user.update({
        where: {
          id: session.user.id,
        },
        data: {
          ...(name && { name }),
          ...(email && { email }),
          ...(image && { image }),
        },
      });
      return res.status(200).json(response);
    } catch (error) {
      if (error.code === "P2002") {
        return res.status(422).end("Email is already in use.");
      }
    }
  } else {
    res.setHeader("Allow", ["PUT"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
});
