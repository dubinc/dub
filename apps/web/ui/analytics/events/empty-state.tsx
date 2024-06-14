import { Button } from "@dub/ui";
import { InvoiceDollar } from "@dub/ui/src/icons";

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
        <Button
          onClick={() => window.open("https://dub.co/docs", "_blank")}
          className="h-8"
          variant="secondary"
          text={
            <span className="bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent">
              Enable Sales Analytics
            </span>
          }
        />
      </div>
    </div>
  );
}
