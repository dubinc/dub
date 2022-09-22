import HomeLayout from "@/components/layout/home";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import Globe from "@/components/home/globe";

export default function About() {
  return (
    <HomeLayout>
      <MaxWidthWrapper>
        <div className="mt-36 text-center">
          <h1 className="font-display font-semibold text-3xl text-gray-700">
            Instant Redirects at the Edge
          </h1>
        </div>
      </MaxWidthWrapper>
      <Globe />
      <div className="py-10 border-t border-black shadow-md w-full h-[500px]">
        <MaxWidthWrapper>
          <div>blah blah blah</div>
        </MaxWidthWrapper>
      </div>
    </HomeLayout>
  );
}
