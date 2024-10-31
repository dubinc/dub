import { PageContent } from "@/ui/layout/page-content";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { MaxWidthWrapper } from "@dub/ui";
import { CircleDollar, User } from "@dub/ui/src/icons";

export default function CustomersPage() {
  return (
    <PageContent title="Customers">
      <MaxWidthWrapper>
        <AnimatedEmptyState
          title="Customers"
          description="View your customers and their referral activity"
          cardContent={
            <>
              <User className="size-4 text-neutral-700" />
              <div className="h-2.5 w-24 min-w-0 rounded-sm bg-neutral-200" />
              <div className="xs:flex hidden grow items-center justify-end gap-1.5 text-gray-500">
                <CircleDollar className="size-3.5" />
              </div>
            </>
          }
          pillContent="Coming soon"
        />
      </MaxWidthWrapper>
    </PageContent>
  );
}
