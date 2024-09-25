import { GOOGLE_FAVICON_URL, cn } from "@dub/utils";
import { BlurImage } from "./blur-image";
import { Globe2 } from "./icons";

export function LinkLogo({
  apexDomain,
  className,
}: {
  apexDomain?: string | null;
  className?: string;
}) {
  return apexDomain ? (
    <BlurImage
      src={`${GOOGLE_FAVICON_URL}${apexDomain}`}
      alt={apexDomain}
      className={cn("h-8 w-8 rounded-full sm:h-10 sm:w-10", className)}
      width={20}
      height={20}
      draggable={false}
    />
  ) : (
    <div
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 px-0 sm:h-10 sm:w-10",
        className,
      )}
    >
      <Globe2 className="h-4 w-4 text-gray-600 sm:h-5 sm:w-5" />
    </div>
  );
}
