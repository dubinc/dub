import BlurImage from "../shared/blur-image";
import MaxWidthWrapper from "../shared/max-width-wrapper";

export default function Logos() {
  return (
    <div className="mt-20">
      <p className="text-gray-500 text-lg text-center">
        Giving superpowers to marketing teams at world-class companies
      </p>
      <div className="w-full max-w-screen-lg px-5 sm:px-0 mx-auto mt-10 grid grid-cols-2 sm:grid-cols-4 gap-5 items-center">
        <BlurImage
          src="/_static/clients/vercel.svg"
          alt="Vercel"
          width={2418}
          height={512}
          className="col-span-1 h-7 sm:h-9"
        />
        <BlurImage
          src="/_static/clients/chatwoot.svg"
          alt="Chatwoot"
          width={2418}
          height={512}
          className="col-span-1 h-7 sm:h-10"
        />
        <BlurImage
          src="/_static/clients/crowdin.svg"
          alt="Crowdin"
          width={2418}
          height={512}
          className="col-span-1 h-8 sm:h-10"
        />
        <BlurImage
          src="/_static/clients/testimonial.svg"
          alt="Testimonial"
          width={2418}
          height={512}
          className="col-span-1 h-10 sm:h-12"
        />
      </div>
    </div>
  );
}
