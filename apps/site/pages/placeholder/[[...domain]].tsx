import { GetStaticProps } from "next";
import { ParsedUrlQuery } from "querystring";
import Globe from "@/components/home/globe";
import HomeLayout from "@/components/layout/home";

export default function Placeholder({ domain }: { domain: string }) {
  return (
    <HomeLayout domain={domain}>
      <Globe domain={domain} />
    </HomeLayout>
  );
}
interface Params extends ParsedUrlQuery {
  slug: string[];
}

export const getStaticPaths = async () => {
  const paths = [
    { params: { domain: [] } },
    { params: { domain: ["stey.me"] } },
  ];
  return {
    paths,
    fallback: "blocking",
  };
};

export const getStaticProps: GetStaticProps = async (context) => {
  const { domain } = context.params as Params;
  return {
    props: {
      domain: domain ? domain[0] : "dub.sh",
    },
  };
};
