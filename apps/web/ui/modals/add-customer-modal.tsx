import useWorkspace from "@/lib/swr/use-workspace";
import { CustomerProps } from "@/lib/types";
import {
  createCustomerBodySchema,
  StripeCustomerSchema,
} from "@/lib/zod/schemas/customers";
import { CountryCombobox } from "@/ui/partners/country-combobox";
import {
  AnimatedSizeContainer,
  ArrowUpRight,
  Button,
  Modal,
  StripeIcon,
  Switch,
  useMediaQuery,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import * as z from "zod/v4";

interface AddCustomerModalProps {
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
  onSuccess?: (customer: CustomerProps) => void;
  initialName?: string;
}

type FormData = z.infer<typeof createCustomerBodySchema>;
type StripeCustomer = z.infer<typeof StripeCustomerSchema>;

const STRIPE_DASHBOARD_CUSTOMER_URL = "https://dashboard.stripe.com/customers";

function getCustomerInitials(customer: StripeCustomer): string {
  const raw = customer.name || customer.email || customer.id;
  const parts = raw
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return raw.slice(0, 2).toUpperCase();
}

export const AddCustomerModal = ({
  showModal,
  setShowModal,
  onSuccess,
  initialName,
}: AddCustomerModalProps) => {
  const { id: workspaceId } = useWorkspace();
  const { isMobile } = useMediaQuery();
  const params = useParams();
  const slug = params?.slug as string | undefined;
  const [hasStripeCustomerId, setHasStripeCustomerId] = useState(false);
  const [showStripeImport, setShowStripeImport] = useState(false);
  const [stripeSearchEmail, setStripeSearchEmail] = useState("");
  const [stripeSearchResults, setStripeSearchResults] = useState<
    StripeCustomer[] | null
  >(null);
  const [stripeSearchLoading, setStripeSearchLoading] = useState(false);
  const [stripeSearchError, setStripeSearchError] = useState<string | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { isSubmitting, errors },
  } = useForm<FormData>({
    defaultValues: {
      name: null,
      email: null,
      externalId: "",
      stripeCustomerId: null,
      country: "US",
    },
  });

  const prevShowModal = useRef(showModal);

  useEffect(() => {
    // Only reset when the modal opens (transitions from false to true)
    if (showModal && !prevShowModal.current) {
      setHasStripeCustomerId(false);
      setShowStripeImport(false);
      setStripeSearchEmail("");
      setStripeSearchResults(null);
      setStripeSearchError(null);
      reset({
        name: initialName || null,
        email: null,
        externalId: "",
        stripeCustomerId: null,
        country: "US",
      });
    }
    prevShowModal.current = showModal;
  }, [showModal, initialName, reset]);

  useEffect(() => {
    if (!hasStripeCustomerId) {
      setValue("stripeCustomerId", null);
    }
  }, [hasStripeCustomerId, setValue]);

  const onSearchStripe = useCallback(async () => {
    const email = stripeSearchEmail.trim();
    if (!email) {
      setStripeSearchError("Enter an email to search.");
      return;
    }
    setStripeSearchError(null);
    setStripeSearchResults(null);
    setStripeSearchLoading(true);
    try {
      const response = await fetch(
        `/api/customers/search-stripe?workspaceId=${workspaceId}&search=${encodeURIComponent(email)}`,
      );
      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error?.message || "Search failed.");
      }
      const data = await response.json();
      setStripeSearchResults(data);
      if (data.length === 0) {
        setStripeSearchError("No Stripe customers found for this email.");
      }
    } catch (err) {
      setStripeSearchError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
      setStripeSearchResults([]);
    } finally {
      setStripeSearchLoading(false);
    }
  }, [workspaceId, stripeSearchEmail]);

  const onSelectStripeCustomer = useCallback(
    (customer: StripeCustomer) => {
      setValue("name", customer.name ?? null, { shouldValidate: true });
      setValue("email", customer.email ?? null, { shouldValidate: true });
      setValue("externalId", customer.email ?? customer.id, {
        shouldValidate: true,
      });
      setValue("stripeCustomerId", customer.id, { shouldValidate: true });
      setValue("country", customer.country ?? "US", { shouldValidate: true });
      setHasStripeCustomerId(true);
      setShowStripeImport(false);
      setStripeSearchResults(null);
      setStripeSearchEmail("");
      setStripeSearchError(null);
      toast.success("Customer details filled from Stripe.");
    },
    [setValue],
  );

  const onSubmit = async (data: FormData) => {
    try {
      const response = await fetch(
        `/api/customers?workspaceId=${workspaceId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error.message || "Failed to create customer.");
      }

      const customer = await response.json();
      await mutate(`/api/customers?workspaceId=${workspaceId}`);
      toast.success(
        `Customer with ID "${customer.externalId}" added successfully!`,
      );
      onSuccess?.(customer);
      setShowModal(false);
    } catch (error) {
      toast.error(error.message || "Something went wrong.");
    }
  };

  const externalId = watch("externalId");
  const country = watch("country");

  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <div className="flex items-center justify-between gap-2 border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="text-lg font-medium">Create new customer</h3>
        {!showStripeImport && (
          <Button
            type="button"
            variant="secondary"
            className="h-9 w-fit"
            icon={<StripeIcon className="size-4" />}
            text="Import from Stripe"
            onClick={() => {
              setShowStripeImport(true);
              setStripeSearchResults(null);
              setStripeSearchError(null);
            }}
          />
        )}
      </div>

      <div className="bg-neutral-50">
        <form
          onSubmit={(e) => {
            e.stopPropagation();
            return handleSubmit(onSubmit)(e);
          }}
        >
          <AnimatedSizeContainer
            height
            className="flex flex-col"
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
          >
            {showStripeImport ? (
              <div className="flex flex-col gap-5 px-4 py-6 sm:px-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowStripeImport(false);
                    setStripeSearchResults(null);
                    setStripeSearchError(null);
                  }}
                  className="-ml-1 flex w-fit items-center gap-1 text-xs text-neutral-500 transition-colors hover:text-neutral-700"
                >
                  <span className="text-neutral-400">←</span>
                  Back to manual input
                </button>
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-neutral-500">
                    Search by email in your connected Stripe account to pull in
                    customer details.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      autoComplete="off"
                      placeholder="customer@example.com"
                      value={stripeSearchEmail}
                      onChange={(e) => setStripeSearchEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          onSearchStripe();
                        }
                      }}
                      className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm transition-colors focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                    />
                    <Button
                      type="button"
                      text="Search"
                      className="h-10 w-fit"
                      loading={stripeSearchLoading}
                      disabled={!stripeSearchEmail.trim()}
                      onClick={onSearchStripe}
                    />
                  </div>
                  {stripeSearchError && (
                    <p className="ml-1 text-xs text-red-600">
                      {stripeSearchError}
                    </p>
                  )}
                </div>
                {stripeSearchResults && stripeSearchResults.length > 0 && (
                  <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
                    <div className="border-b border-neutral-100 bg-neutral-50/80 px-3 py-2">
                      <p className="text-xs font-medium text-neutral-500">
                        Search results
                      </p>
                    </div>
                    <ul className="max-h-52 overflow-y-auto p-1.5">
                      {stripeSearchResults.map((customer) => {
                        const displayName =
                          customer.name || customer.email || customer.id;
                        const initials = getCustomerInitials(customer);
                        const stripeUrl = `${STRIPE_DASHBOARD_CUSTOMER_URL}/${customer.id}`;

                        return (
                          <li key={customer.id}>
                            <button
                              type="button"
                              disabled={!!customer.dubCustomerId}
                              onClick={() => onSelectStripeCustomer(customer)}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-md px-2.5 py-2.5 text-left",
                                customer.dubCustomerId
                                  ? "cursor-not-allowed opacity-60"
                                  : "transition-colors hover:bg-neutral-100",
                              )}
                            >
                              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-medium text-neutral-600">
                                {initials}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                  <span className="font-medium text-neutral-800">
                                    {displayName}
                                  </span>
                                  {customer.email && customer.name && (
                                    <span className="truncate text-xs text-neutral-500">
                                      {customer.email}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-neutral-500">
                                  <a
                                    href={stripeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-0.5 font-mono hover:text-neutral-700"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {customer.id}
                                    <ArrowUpRight className="size-3 shrink-0" />
                                  </a>
                                  {customer.subscriptions > 0 && (
                                    <span>{customer.subscriptions} sub</span>
                                  )}
                                  {customer.dubCustomerId && (
                                    <a
                                      href={`/${slug}/program/customers/${customer.dubCustomerId}`}
                                      target="_blank"
                                      className="rounded bg-neutral-200/80 px-1.5 py-0.5 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900"
                                    >
                                      Already on Dub
                                    </a>
                                  )}
                                </div>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-6 px-4 py-6 text-left sm:px-6">
                <div>
                  <label className="text-sm font-medium text-neutral-600">
                    Name
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    className="mt-1.5 block w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm transition-colors focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                    placeholder="John Doe"
                    autoFocus={!isMobile}
                    {...register("name", {
                      setValueAs: (value) => (value === "" ? null : value),
                    })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-neutral-600">
                    Email
                  </label>
                  <input
                    type="email"
                    autoComplete="off"
                    className="mt-1.5 block w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm transition-colors focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                    placeholder="john@example.com"
                    {...register("email", {
                      setValueAs: (value) => (value === "" ? null : value),
                    })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-neutral-600">
                    Country <span className="text-neutral-400">(required)</span>
                  </label>
                  <CountryCombobox
                    value={country || "US"}
                    onChange={(value) =>
                      setValue("country", value, { shouldValidate: true })
                    }
                    error={!!errors.country}
                    className="mt-1.5"
                  />
                  <input
                    type="hidden"
                    {...register("country", { required: true })}
                  />
                  <p className="mt-1.5 text-xs text-neutral-500">
                    Used in analytics and country-specific rewards.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-neutral-600">
                    External ID{" "}
                    <span className="text-neutral-400">(required)</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    className="mt-1.5 block w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm transition-colors focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                    placeholder="e.g. cus_xxx or john@example.com"
                    {...register("externalId", { required: true })}
                  />
                  <p className="mt-1.5 text-xs text-neutral-500">
                    Your unique ID for this customer (e.g. database ID or
                    email).
                  </p>
                </div>

                <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-4">
                    <Switch
                      fn={setHasStripeCustomerId}
                      checked={hasStripeCustomerId}
                      trackDimensions="w-8 h-4"
                      thumbDimensions="w-3 h-3"
                      thumbTranslate="translate-x-4"
                    />
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium text-neutral-700">
                        Add
                      </span>
                      <span className="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 font-mono text-xs text-neutral-500">
                        stripeCustomerId
                      </span>
                    </div>
                  </div>
                  {hasStripeCustomerId && (
                    <div className="mt-4">
                      <label
                        htmlFor="stripeCustomerId"
                        className="text-sm font-medium text-neutral-600"
                      >
                        Stripe Customer ID
                      </label>
                      <input
                        type="text"
                        id="stripeCustomerId"
                        autoComplete="off"
                        className="mt-1.5 block w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm transition-colors focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                        placeholder="cus_NffrFeUfNV2Hib"
                        {...register("stripeCustomerId", {
                          setValueAs: (value) => (value === "" ? null : value),
                        })}
                      />
                      <p className="mt-1.5 text-xs text-neutral-500">
                        Optional. Used to attribute recurring sales to partners.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </AnimatedSizeContainer>

          <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-4 py-4 sm:px-6">
            <Button
              type="button"
              variant="secondary"
              text="Cancel"
              className="h-9 w-fit"
              onClick={() => setShowModal(false)}
              disabled={isSubmitting}
            />
            <Button
              type="submit"
              text="Create customer"
              className="h-9 w-fit"
              loading={isSubmitting}
              disabled={showStripeImport || !externalId || !country}
            />
          </div>
        </form>
      </div>
    </Modal>
  );
};

export function useAddCustomerModal({
  onSuccess,
}: {
  onSuccess?: (customer: CustomerProps) => void;
} = {}) {
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [initialName, setInitialName] = useState<string | undefined>();

  const AddCustomerModalCallback = useCallback(() => {
    return (
      <AddCustomerModal
        showModal={showAddCustomerModal}
        setShowModal={(show) => {
          setShowAddCustomerModal(show);
          if (!show) {
            setInitialName(undefined);
          }
        }}
        onSuccess={onSuccess}
        initialName={initialName}
      />
    );
  }, [showAddCustomerModal, initialName, onSuccess]);

  const setShowAddCustomerModalWithName = useCallback(
    (show: boolean, name?: string) => {
      setShowAddCustomerModal(show);
      setInitialName(name);
    },
    [],
  );

  return useMemo(
    () => ({
      setShowAddCustomerModal: setShowAddCustomerModalWithName,
      AddCustomerModal: AddCustomerModalCallback,
    }),
    [setShowAddCustomerModalWithName, AddCustomerModalCallback],
  );
}
