import { ProgramPartnerAboutPageClient } from "./page-client";

export default function ProgramPartnerAboutPage() {
  return (
    <>
      <h2 className="text-content-emphasis text-lg font-semibold">About</h2>
      <div className="mt-5 flex flex-col gap-5">
        <ProgramPartnerAboutPageClient />
      </div>
    </>
  );
}
