"use client";

import { STRIPE_PAYMENT_METHODS } from "@/lib/stripe/payment-methods";
import usePaymentMethods from "@/lib/swr/use-payment-methods";
import useProgram from "@/lib/swr/use-program";
import useWebhooks from "@/lib/swr/use-webhooks";
import useWorkspace from "@/lib/swr/use-workspace";
import { Badge, Button } from "@dub/ui";
import { MoneyBill, Webhook } from "@dub/ui/icons";
import { capitalize } from "@dub/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ComponentType, ReactNode, useMemo, useState } from "react";

interface PayoutMethodCardProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: ReactNode;
  badge: {
    label: string;
    variant: "green" | "violet";
  };
}

export function ProgramPayoutMethods() {
  const router = useRouter();
  const { slug } = useWorkspace();
  const { program } = useProgram();
  const { paymentMethods, loading: paymentMethodsLoading } =
    usePaymentMethods();

  const [isLoading, setIsLoading] = useState(false);
  const managePaymentMethods = async () => {
    setIsLoading(true);
    const { url } = await fetch(
      `/api/workspaces/${slug}/billing/payment-methods`,
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    ).then((res) => res.json());

    router.push(url);
  };

  // Only show the default payment method (ACH if configured, or card if not)
  const displayPaymentMethods = useMemo(() => {
    if (!paymentMethods || paymentMethods.length === 0) return [];

    // Take only the first payment method (ACH if configured, otherwise card)
    const pm = paymentMethods[0];
    const paymentMethod = STRIPE_PAYMENT_METHODS[pm.type];

    if (!paymentMethod) return [];

    let title = "";
    let details = "";

    if (pm.link) {
      title = "Link";
      details = pm.link.email
        ? `Account ending in ••••${pm.link.email.slice(-4)}`
        : "Link payment method";
    } else if (pm.card) {
      title = pm.card.brand
        ? capitalize(pm.card.brand) || pm.card.brand
        : "Card";
      details = `Account ending in ••••${pm.card.last4}`;
    } else if (pm.us_bank_account) {
      title = "ACH";
      details = `Account ending in ••••${pm.us_bank_account.last4}`;
    } else if (pm.acss_debit) {
      title = "ACSS Debit";
      details = `Account ending in ••••${pm.acss_debit.last4}`;
    } else if (pm.sepa_debit) {
      title = "SEPA Debit";
      details = `Account ending in ••••${pm.sepa_debit.last4}`;
    } else {
      title = paymentMethod.label;
      details = `Account ending in ••••${pm[paymentMethod.type]?.last4 || "****"}`;
    }

    return [
      {
        id: pm.id,
        title,
        details,
        icon: paymentMethod.icon,
        type: "connected",
      },
    ];
  }, [paymentMethods]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-base font-semibold leading-6 text-neutral-900">
            Payout method
          </h4>
          <p className="mt-1 text-sm font-medium text-neutral-500">
            Your connected payout methods.
          </p>
        </div>
        <Button
          variant="secondary"
          text="Manage"
          className="h-7 w-fit px-2.5 py-2"
          onClick={managePaymentMethods}
          loading={isLoading}
        />
      </div>

      <div className="space-y-2">
        {paymentMethodsLoading ? (
          <div className="space-y-2">
            <div className="h-12 animate-pulse rounded-lg bg-neutral-100" />
            <div className="h-12 animate-pulse rounded-lg bg-neutral-100" />
          </div>
        ) : displayPaymentMethods.length > 0 ? (
          displayPaymentMethods.map((method) => (
            <PayoutMethodCard
              key={method.id}
              icon={method.icon}
              title={method.title}
              description={method.details}
              badge={{
                label: "Connected",
                variant: "green",
              }}
            />
          ))
        ) : null}

        {program?.payoutMode !== "internal" && <ExternalPayoutMethods />}

        {!paymentMethodsLoading && displayPaymentMethods.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg bg-neutral-50 py-6">
            <MoneyBill className="mb-2 size-6 text-neutral-900" />
            <h3 className="text-content-emphasis text-xs font-semibold leading-4">
              No payout methods
            </h3>
            <p className="text-content-default text-xs font-medium leading-5">
              A payout method is required to pay out your partners
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PayoutMethodCard({
  icon: Icon,
  title,
  badge,
  description,
  action,
}: PayoutMethodCardProps) {
  return (
    <div className="flex h-12 items-center gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
        <Icon className="size-4.5 text-content-emphasis" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="text-content-emphasis text-xs font-semibold leading-4">
            {title}
          </span>
          <Badge
            variant={badge.variant}
            className="rounded-md px-1 py-0 text-xs"
          >
            {badge.label}
          </Badge>
        </div>
        <p className="text-content-subtle truncate text-xs font-medium leading-4">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

function ExternalPayoutMethods() {
  const { slug } = useWorkspace();
  const { webhooks } = useWebhooks();

  // Filter webhooks with payout.confirmed trigger
  const externalPayoutWebhooks = useMemo(() => {
    if (!webhooks) return [];

    return webhooks.filter(
      (webhook) =>
        webhook.triggers &&
        Array.isArray(webhook.triggers) &&
        webhook.triggers.includes("payout.confirmed") &&
        webhook.disabledAt === null &&
        webhook.installationId === null,
    );
  }, [webhooks]);

  return externalPayoutWebhooks.map((webhook) => (
    <PayoutMethodCard
      key={webhook.id}
      icon={Webhook}
      title={webhook.name}
      description={webhook.url}
      badge={{
        label: "External",
        variant: "violet",
      }}
      action={
        <Link href={`/${slug}/settings/webhooks/${webhook.id}`} target="_blank">
          <Button
            type="button"
            variant="secondary"
            text="View"
            className="h-7 w-fit px-2.5 py-2"
          />
        </Link>
      }
    />
  ));
}
