import { constructMetadata } from "@dub/utils";

export const metadata = constructMetadata({
  noIndex: true,
});

export default function Partners() {
  return (
    <div>
      <h1 className="animate-slide-up-fade mt-10 text-2xl font-medium [--offset:10px] [animation-delay:250ms] [animation-duration:1s] [animation-fill-mode:both]">
        Dub Partner Portal
      </h1>
      <p className="animate-slide-up-fade mt-2 text-gray-500 [--offset:10px] [animation-delay:500ms] [animation-duration:1s] [animation-fill-mode:both]">
        Coming soon
      </p>
    </div>
  );
}
