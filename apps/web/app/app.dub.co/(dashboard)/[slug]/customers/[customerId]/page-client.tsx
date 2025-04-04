"use client";

import useCustomer from "@/lib/swr/use-customer";
import useWorkspace from "@/lib/swr/use-workspace";
import { BackLink } from "@/ui/shared/back-link";
import { CopyButton } from "@dub/ui";
import { DICEBEAR_AVATAR_URL } from "@dub/utils";
import { notFound, useParams } from "next/navigation";

export function CustomerPageClient() {
  const { customerId } = useParams<{ customerId: string }>();

  const { slug } = useWorkspace();
  const { data: customer, isLoading, error } = useCustomer({ customerId });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  if (!customer) notFound();

  return (
    <div className="mt-2">
      <BackLink href={`/${slug}/links`}>Dashboard</BackLink>
      <div className="mt-5 flex items-center gap-4">
        <img
          src={customer.avatar || `${DICEBEAR_AVATAR_URL}${customer.name}`}
          alt={customer.name}
          className="size-12 rounded-full"
        />
        <div className="flex flex-col gap-1">
          <h1 className="text-base font-semibold leading-tight text-neutral-900">
            {customer.name}
          </h1>

          {customer.email && (
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-neutral-500">
                {customer.email}
              </span>
              <CopyButton
                value={customer.email}
                variant="neutral"
                className="p-1 [&>*]:h-3 [&>*]:w-3"
                successMessage="Copied email to clipboard!"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
