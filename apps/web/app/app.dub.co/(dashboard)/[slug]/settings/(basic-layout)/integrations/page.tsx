import { IntegrationsList } from "./integrations-list";

export const revalidate = 300; // 5 minutes

export default function IntegrationsPage() {
  return (
    <div className="mx-auto flex w-full max-w-screen-md flex-col gap-12">
      <div className="">
        <h1 className="text-2xl font-semibold tracking-tight text-black">
          Integrations
        </h1>
        <p className="mb-2 mt-2 text-base text-neutral-600">
          Use Dub with your existing favorite tools with our seamless
          integrations.
        </p>
      </div>
      <IntegrationsList />
    </div>
  );
}
