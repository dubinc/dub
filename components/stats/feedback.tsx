import BlurImage from "@/components/shared/blur-image";

export default function Feedback() {
  return (
    <div className="relative bg-white px-7 py-5 sm:shadow-lg sm:rounded-lg border border-gray-200 sm:border-gray-100 h-[420px] overflow-scroll scrollbar-hide">
      <div className="mb-5 flex">
        <h1 className="text-xl font-semibold">Feedback</h1>
      </div>
      <div className="flex justify-center items-center">
        <BlurImage
          src="/static/illustrations/selfie.svg"
          alt="No links yet"
          width={250}
          height={250}
        />
      </div>
    </div>
  );
}
