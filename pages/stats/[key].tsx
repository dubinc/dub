import HomeLayout from "@/components/layout/home";
import Stats from "@/components/stats";
import prisma from "@/lib/prisma";
import { nFormatter } from "@/lib/utils";
import { HOME_HOSTNAMES } from "@/lib/constants";
import { GetServerSideProps } from "next";
import { conn } from "@/lib/planetscale";

export const config = {
  runtime: "edge",
};

export default function StatsPage({
  url,
  clicks,
  _key,
  domain,
}: {
  url: string;
  clicks: number;
  _key: string;
  domain?: string;
}) {
  return (
    <HomeLayout
      meta={{
        title: `Stats for ${domain}/${_key} (${nFormatter(
          clicks,
        )} clicks) - Dub`,
        description: `Stats page for ${domain}/${_key}, which redirects to ${url} and has received ${nFormatter(
          clicks,
        )} total clicks.`,
        image: `https://dub.sh/api/og/stats?domain=${domain}&key=${_key}&clicks=${clicks}`,
      }}
    >
      <div className="bg-gray-50">
        <Stats domain={domain} />
      </div>
    </HomeLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({
  req,
  params,
}) => {
  const { key } = params as { key: string };
  let domain = req.headers.host;
  if (HOME_HOSTNAMES.has(domain) || domain.endsWith(".vercel.app"))
    domain = "dub.sh";

  const { rows } =
    (await conn.execute(
      "SELECT `key`, url, clicks FROM Link WHERE domain = ? AND `key` = ?",
      [domain, key],
    )) || {};

  console.log(rows);

  if (rows && Array.isArray(rows) && rows.length > 0) {
    return {
      props: {
        ...rows[0],
        _key: key,
        domain,
      },
    };
  } else {
    return { notFound: true };
  }
};
