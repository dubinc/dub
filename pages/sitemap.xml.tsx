import prisma from "@/lib/prisma";
import { NextApiRequest, NextApiResponse } from "next";

function generateSiteMap({
  hostname,
  links,
}: {
  hostname: string;
  links: { key: string }[];
}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
     <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
       <url>
         <loc>${hostname}</loc>
       </url>
       <url>
         <loc>${hostname}/metatags</loc>
       </url>
       ${links
         .map(({ key }) => {
           return `
         <url>
             <loc>${`${hostname}/stats/${key}`}</loc>
         </url>
       `;
         })
         .join("")}
     </urlset>
   `;
}

function SiteMap() {
  // getServerSideProps will do the heavy lifting
}

export async function getServerSideProps({
  req,
  res,
}: {
  req: NextApiRequest;
  res: NextApiResponse;
}) {
  const hostname = `https://dub.sh`;

  // Get top 100 links (sorted by clicks in descending order)
  const links = await prisma.link.findMany({
    where: {
      domain: "dub.sh",
    },
    select: {
      key: true,
    },
    orderBy: {
      clicks: "desc",
    },
    take: 100,
  });

  // We generate the XML sitemap with the posts data
  const sitemap = generateSiteMap({
    hostname,
    links,
  });

  res.setHeader("Content-Type", "text/xml");
  // we send the XML to the browser
  res.write(sitemap);
  res.end();

  return {
    props: {},
  };
}

export default SiteMap;
