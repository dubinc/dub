import HomeLayout from "@/components/layout/home";
import Stats from "@/components/stats";
import { isHomeHostname, nFormatter } from "@/lib/utils";
import { GetServerSideProps } from "next";
import { getLinkViaEdge } from "@/lib/planetscale";

export const config = {
  runtime: "experimental-edge",
};

export default function StatsPage({
  url,
  _key,
  domain,
}: {
  url: string;
  _key: string;
  domain?: string;
}) {
  return (
    <HomeLayout
      meta={{
        title: `Stats for ${domain}/${_key} - Dub`,
        description: `Stats page for ${domain}/${_key}, which redirects to ${url}.`,
        image: `https://dub.sh/api/og/stats?domain=${domain}&key=${_key}`,
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
  if (isHomeHostname(domain)) domain = "dub.sh";

  const data = await getLinkViaEdge(domain, key);

  if (data && data.publicStats) {
    return {
      props: {
        ...data,
        _key: key,
        domain,
      },
    };
  } else {
    return { notFound: true };
  }
};
