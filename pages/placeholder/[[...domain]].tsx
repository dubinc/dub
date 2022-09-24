import HomeLayout from "@/components/layout/home";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import Globe from "@/components/home/globe";
import { ParsedUrlQuery } from "querystring";
import { GetStaticProps } from "next";

export default function Placeholder({ domain }: { domain: string }) {
  return (
    <HomeLayout domain={domain}>
      <Globe hostname={domain} />
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
