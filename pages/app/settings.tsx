import PlanUsage from "@/components/app/settings/plan-usage";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import AppLayout from "components/layout/app";

export default function Settings() {
  return (
    <AppLayout>
      <div className="h-36 flex items-center bg-white border-b border-gray-200">
        <MaxWidthWrapper>
          <div className="flex justify-between items-center">
            <h1 className="text-2xl text-gray-600">Settings</h1>
          </div>
        </MaxWidthWrapper>
      </div>
      <MaxWidthWrapper>
        <div className="py-10 grid gap-5">
          <PlanUsage />
        </div>
      </MaxWidthWrapper>
    </AppLayout>
  );
}
