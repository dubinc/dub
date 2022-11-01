import MaxWidthWrapper from "../shared/max-width-wrapper";

export default function Testimonials() {
  return (
    <MaxWidthWrapper className="py-20">
      <div className="mx-auto max-w-md text-center sm:max-w-xl">
        <h2 className="font-display text-4xl font-extrabold leading-tight text-black sm:text-5xl sm:leading-tight">
          <span className="bg-gradient-to-r from-red-600 to-amber-600 bg-clip-text text-transparent">
            Loved
          </span>{" "}
          by our users
        </h2>
        <p className="mt-5 text-gray-600 sm:text-lg">
          Don't take it from us - here's what our users have to say about Dub.
        </p>
      </div>
    </MaxWidthWrapper>
  );
}
