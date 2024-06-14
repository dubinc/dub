import { buttonVariants } from "@dub/ui";
import { InvoiceDollar } from "@dub/ui/src/icons";
import { cn } from "@dub/utils";
import Link from "next/link";

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50">
        <InvoiceDollar className="h-8 w-8 text-black" strokeWidth={0.75} />
      </div>
      <p className="mt-8 text-center font-medium text-gray-950">
        Lead and sales analytics
      </p>
      <p className="mt-4 max-w-md text-center text-gray-500">
        Collect insights on lead generation and sales with metrics. Learn about
        top-converting leads and best-selling products.
      </p>
      <div className="mt-8">
        <Link
          href="https://dub.co/docs"
          target="_blank"
          className={cn(
            buttonVariants({ variant: "secondary" }),
            "flex h-8 items-center justify-center gap-2 rounded-md border px-4 text-sm transition-all",
          )}
        >
          <span className="bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent">
            Enable Sales Analytics
          </span>
        </Link>
      </div>
    </div>
  );
}
