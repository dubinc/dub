import Stats from "@/components/stats";
import { GetStaticPaths, GetStaticProps } from "next";
import { ParsedUrlQuery } from "querystring";
import { RawStatsProps } from "@/lib/stats";

interface StatsPageProps {
  _key: string;
  stats: RawStatsProps[];
}

export default function StatsPage(props: StatsPageProps) {
  return (
    <div>
      <Stats />
    </div>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: [],
    fallback: "blocking",
  };
};

interface Params extends ParsedUrlQuery {
  key: string;
}

export const getStaticProps: GetStaticProps = async (context) => {
  const { key } = context.params as Params; // https://wallis.dev/blog/nextjs-getstaticprops-and-getstaticpaths-with-typescript
  return {
    props: { key, _key: key },
  };
};
