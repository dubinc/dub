import Stats from "@/components/stats";
import { GetStaticPaths, GetStaticProps } from "next";
import { ParsedUrlQuery } from "querystring";

export default function StatsPage() {
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
    props: { key },
  };
};
