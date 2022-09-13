import HomeLayout from "@/components/layout/home";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import Globe from "@/components/home/about/globe";

export default function Placeholder() {
  return (
    <HomeLayout>
      <MaxWidthWrapper>
        <div className="mt-36 text-center">
          <h1 className="font-display font-semibold text-3xl text-gray-700">
            This is a custom domain from Dub.sh
          </h1>
        </div>
      </MaxWidthWrapper>
      <Globe />
    </HomeLayout>
  );
}
