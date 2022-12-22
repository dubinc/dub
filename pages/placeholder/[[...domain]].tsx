import { GetStaticProps } from "next";
import { ParsedUrlQuery } from "querystring";
import Globe from "@/components/home/globe";
import HomeLayout from "@/components/layout/home";

export default function Placeholder() {
  return (
    <HomeLayout>
      <Globe />
    </HomeLayout>
  );
}
interface Params extends ParsedUrlQuery {
  slug: string[];
}

export const getStaticPaths = async () => {
  return {
    paths: [],
    fallback: "blocking",
  };
};

export const getStaticProps: GetStaticProps = async (context) => {
  const { domain } = context.params as Params;
  return {
    props: {
      domain,
    },
  };
};
