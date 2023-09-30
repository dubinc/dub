import BlurImage from "#/ui/blur-image";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="font-display text-6xl font-bold">404</h1>
      <BlurImage
        src="/_static/illustrations/call-waiting.svg"
        alt="404"
        width={400}
        height={400}
        className="pointer-events-none -my-8"
      />
      <p className="text-2xl font-medium">
        Page not found. Back to{" "}
        <Link
          href="/help"
          className="text-gray-600 underline underline-offset-4 transition-colors hover:text-black"
        >
          Help Center
        </Link>
        .
      </p>
    </div>
  );
}
