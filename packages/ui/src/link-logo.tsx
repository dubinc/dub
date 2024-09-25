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
        "flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 p-1 sm:h-10 sm:w-10 sm:p-2",
        className,
      )}
    >
      <Globe2 className="h-full w-full text-gray-600" />
    </div>
  );
}
