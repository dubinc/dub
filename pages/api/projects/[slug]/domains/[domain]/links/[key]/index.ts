import { NextApiRequest, NextApiResponse } from "next";
import { editLink, deleteLink } from "@/lib/upstash";
import { withProjectAuth } from "@/lib/auth";
import cloudinary from "cloudinary";

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse) => {
    const { domain, key: oldKey } = req.query as {
      domain: string;
      key: string;
    };

    if (req.method === "PUT") {
      let { key, url, title, timestamp, description, image } = req.body;
      if (!key || !url || !title || !timestamp) {
        return res
          .status(400)
          .json({ error: "Missing key or url or title or timestamp" });
      }
      if (image) {
        const { secure_url } = await cloudinary.v2.uploader.upload(image, {
          public_id: key,
          folder: domain,
          overwrite: true,
          invalidate: true,
        });
        image = secure_url;
        if (key !== oldKey) {
          await cloudinary.v2.uploader.destroy(`${domain}/${oldKey}`, {
            invalidate: true,
          });
        }
      }
      const response = await editLink(domain, oldKey, {
        key,
        url,
        title,
        timestamp,
        description,
        image,
      });
      if (response === null) {
        return res.status(400).json({ error: "Key already exists" });
      }
      return res.status(200).json(response);
    } else if (req.method === "DELETE") {
      const response = await Promise.all([
        deleteLink(domain, oldKey),
        cloudinary.v2.uploader.destroy(`${domain}/${oldKey}`, {
          invalidate: true,
        }),
      ]);
      return res.status(200).json(response);
    } else {
      res.setHeader("Allow", ["POST", "DELETE"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  },
  true
);
