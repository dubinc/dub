import PlanUsage from "@/components/app/settings/plan-usage";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import AppLayout from "components/layout/app";

export default function Settings() {
  return (
    <AppLayout>
      <div className="flex h-36 items-center border-b border-gray-200 bg-white">
        <MaxWidthWrapper>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl text-gray-600">Settings</h1>
          </div>
        </MaxWidthWrapper>
      </div>
      <MaxWidthWrapper>
        <div className="grid gap-5 py-10">
          <PlanUsage />
        </div>
      </MaxWidthWrapper>
    </AppLayout>
  );
}
