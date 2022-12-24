import HomeLayout from "@/components/layout/home";
import Stats from "@/components/stats";
import prisma from "@/lib/prisma";
import { nFormatter } from "@/lib/utils";

export default function StatsPage({
  _key,
  url,
  clicks,
}: {
  _key: string;
  url: string;
  clicks: number;
}) {
  return (
    <HomeLayout
      meta={{
        title: `Stats for dub.sh/${_key} (${nFormatter(clicks)} clicks) - Dub`,
        description: `Stats page for dub.sh/${_key}, which redirects to ${url} and has received ${nFormatter(
          clicks,
        )} total clicks.`,
        image: `https://dub.sh/api/og/stats?key=${_key}&clicks=${clicks}`,
      }}
    >
      <div className="bg-gray-50">
        <Stats />
      </div>
    </HomeLayout>
  );
}

export const getStaticPaths = async () => {
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
  return {
    paths: links.map(({ key }) => ({
      params: {
        key,
      },
    })),
    fallback: true,
  };
};

export const getStaticProps = async (context) => {
  const { key } = context.params;

  const props = await prisma.link.findUnique({
    where: {
      domain_key: {
        domain: "dub.sh",
        key,
      },
    },
    select: {
      key: true,
      url: true,
      clicks: true,
    },
  });

  if (props) {
    return {
      props: {
        ...props,
        _key: key,
      },
      revalidate: 60,
    };
  } else {
    return { notFound: true, revalidate: 0 };
  }
};
