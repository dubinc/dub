import { hashToken, withUserAuth } from "#/lib/auth";
import prisma from "#/lib/prisma";
import { customAlphabet } from "nanoid";

const generateToken = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  24,
);

export default withUserAuth(async (req, res, session) => {
  // GET /api/user/tokens – get all tokens for a specific user
  if (req.method === "GET") {
    const tokens = await prisma.token.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        name: true,
        partialKey: true,
        createdAt: true,
        lastUsed: true,
      },
      orderBy: [
        {
          lastUsed: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    });
    return res.status(200).json(tokens);

    // POST /api/user/tokens – create a new token for a specific user
  } else if (req.method === "POST") {
    const { name } = req.body;
    const token = generateToken();
    const hashedKey = hashToken(token, {
      noSecret: true,
    });
    // take first 3 and last 4 characters of the key
    const partialKey = `${token.slice(0, 3)}...${token.slice(-4)}`;

    await prisma.token.create({
      data: {
        name,
        hashedKey,
        partialKey,
        userId: session.user.id,
      },
    });
    return res.status(200).json({ token });

    // DELETE /api/user/tokens – delete a token for a specific user
  } else if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id || typeof id !== "string") {
      return res.status(400).end("Invalid token ID");
    }
    const response = await prisma.token.delete({
      where: {
        id,
        userId: session.user.id,
      },
    });
    return res.status(200).json(response);
  } else {
    res.setHeader("Allow", ["PUT", "DELETE"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
});
