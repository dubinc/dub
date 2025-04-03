"use client";

import useCustomer from "@/lib/swr/use-customer";
import useWorkspace from "@/lib/swr/use-workspace";
import { CopyButton, Tooltip } from "@dub/ui";
import { COUNTRIES, DICEBEAR_AVATAR_URL } from "@dub/utils";
import { notFound, useParams } from "next/navigation";

export function CustomerPageClient() {
  const { customerId } = useParams<{ customerId: string }>();

  const { slug } = useWorkspace();
  const { data: customer, isLoading, error } = useCustomer({ customerId });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  if (!customer) notFound();

  return (
    <div className="mt-4 flex items-center gap-4">
      <div className="relative w-fit">
        <img
          src={customer.avatar || `${DICEBEAR_AVATAR_URL}${customer.name}`}
          alt={customer.name}
          className="size-12 rounded-full"
        />
        {customer.country && (
          <Tooltip content={COUNTRIES[customer.country]}>
            <div className="absolute -right-1 top-0 overflow-hidden rounded-full bg-neutral-50 p-0.5 transition-transform duration-100 hover:scale-[1.15]">
              <img
                alt=""
                src={`https://flag.vercel.app/m/${customer.country}.svg`}
                className="size-3 rounded-full"
              />
            </div>
          </Tooltip>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold leading-tight text-neutral-900">
            {customer.name}
          </h1>
          <span className="rounded-full border border-neutral-200 bg-neutral-200 px-1.5 py-0.5 text-xs text-neutral-900">
            {new Date(customer.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>

        {customer.email && (
          <div className="flex items-center gap-1">
            <span className="text-sm text-neutral-500">{customer.email}</span>
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
  );
}
