"use client";

import { clientAccessCheck } from "@/lib/client-access-check";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button, Combobox, DubProductIcon } from "@dub/ui";
import { cn } from "@dub/utils";
import { DubProduct } from "@prisma/client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";

const products = {
  links: {
    label: "Dub Links",
    icon: "links" as const,
  },
  program: {
    label: "Dub Partners",
    icon: "partners" as const,
  },
} satisfies Record<DubProduct, { label: string; icon: "links" | "partners" }>;

export default function UpdateDefaultProduct() {
  const { id, slug, defaultProduct, role } = useWorkspace();
  const [selectedProduct, setSelectedProduct] = useState<DubProduct | null>(
    null,
  );
  const [openPopover, setOpenPopover] = useState(false);

  useEffect(() => {
    setSelectedProduct(defaultProduct ?? "links");
  }, [defaultProduct]);

  const [saving, setSaving] = useState(false);

  const permissionsError = clientAccessCheck({
    action: "workspaces.write",
    role,
  }).error;

  const productOptions = useMemo(() => {
    return Object.entries(products).map(([value, { label, icon }]) => ({
      value,
      label,
      icon: <DubProductIcon product={icon} />,
    }));
  }, []);

  const selectedOption = useMemo(() => {
    if (!selectedProduct) {
      return null;
    }

    const product = products[selectedProduct];

    return {
      value: selectedProduct,
      label: product.label,
      icon: <DubProductIcon product={product.icon} />,
    };
  }, [selectedProduct]);

  async function updateDefaultProduct() {
    if (!id || !selectedProduct) {
      return;
    }

    setSaving(true);
    const response = await fetch(`/api/workspaces/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        defaultProduct: selectedProduct,
      }),
    });

    if (response.ok) {
      await mutate(`/api/workspaces/${slug}`);
      setSaving(false);
    } else {
      setSaving(false);
      const { error } = await response.json();
      throw new Error(error.message);
    }
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        toast.promise(updateDefaultProduct(), {
          loading: "Saving changes...",
          success: "Successfully updated your default product!",
          error: (error) => error.message,
        });
      }}
      className="rounded-xl border border-neutral-200 bg-white"
    >
      <div className="flex flex-col space-y-6 p-6">
        <div className="flex flex-col space-y-1">
          <h2 className="text-base font-semibold">Default Product</h2>
          <p className="text-sm text-neutral-500">
            Choose which product tab to show by default when you open this
            workspace.
          </p>
        </div>
        <div className="mt-1 max-w-md">
          <Combobox
            options={productOptions}
            setSelected={(option) => {
              setSelectedProduct(option.value as DubProduct);
            }}
            selected={selectedOption}
            icon={selectedOption?.icon}
            caret={true}
            placeholder="Select product"
            searchPlaceholder="Search products..."
            matchTriggerWidth
            open={openPopover}
            onOpenChange={setOpenPopover}
            buttonProps={{
              className: cn(
                "w-full justify-start border-neutral-300 px-3",
                "data-[state=open]:ring-1 data-[state=open]:ring-neutral-500 data-[state=open]:border-neutral-500",
                "focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-none",
              ),
            }}
          >
            {selectedOption?.label}
          </Combobox>
        </div>
      </div>

      <div className="flex flex-col items-start justify-start gap-4 rounded-b-xl border-t border-neutral-200 bg-neutral-50 px-6 py-3 sm:flex-row sm:items-center sm:justify-end sm:space-y-0">
        <Button
          text="Save changes"
          className="w-fit"
          loading={saving}
          disabled={
            !!permissionsError ||
            !selectedProduct ||
            selectedProduct === (defaultProduct ?? "links")
          }
          disabledTooltip={permissionsError || undefined}
        />
      </div>
    </form>
  );
}
