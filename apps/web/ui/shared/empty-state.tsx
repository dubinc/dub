import { buttonVariants } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  buttonText,
  buttonLink,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  buttonText?: string;
  buttonLink?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-y-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50">
        <Icon className="h-8 w-8 text-black" strokeWidth={0.75} />
      </div>
      <p className="text-center text-base font-medium text-gray-950">{title}</p>
      {description && (
        <p className="max-w-md text-center text-sm text-gray-500">
          {description}
        </p>
      )}
      {buttonText && buttonLink && (
        <Link
          href={buttonLink}
          {...(buttonLink.startsWith("http") ? { target: "_blank" } : {})}
          className={cn(
            buttonVariants({ variant: "secondary" }),
            "flex h-8 items-center justify-center gap-2 rounded-md border px-4 text-sm",
          )}
        >
          <span className="bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent">
            {buttonText}
          </span>
        </Link>
      )}
    </div>
  );
}
