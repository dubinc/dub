import HomeLayout from "@/components/layout/home";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import Globe from "@/components/home/globe";
import { ParsedUrlQuery } from "querystring";
import { GetStaticProps } from "next";

export default function Placeholder({ hostname }: { hostname: string }) {
  return (
    <HomeLayout>
      {/* <MaxWidthWrapper>
        <div className="mt-36 text-center">
          <h1 className="font-display font-semibold text-3xl text-gray-700">
            This is a custom domain from Dub.sh
          </h1>
        </div>
      </MaxWidthWrapper> */}
      <Globe hostname={hostname} />
    </HomeLayout>
  );
}
interface Params extends ParsedUrlQuery {
  slug: string[];
}

export const getStaticPaths = async () => {
  const paths = [
    { params: { hostname: [] } },
    { params: { hostname: ["stey.me"] } },
  ];
  return {
    paths,
    fallback: "blocking",
  };
};

export const getStaticProps: GetStaticProps = async (context) => {
  const { hostname } = context.params as Params;
  return {
    props: {
      hostname: hostname ? hostname[0] : "dub.sh",
    },
  };
};
