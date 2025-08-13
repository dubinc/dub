"use client";

import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useGroup from "@/lib/swr/use-group";
import usePartners from "@/lib/swr/use-partners";
import { EnrolledPartnerProps, GroupProps } from "@/lib/types";
import { updateGroupSchema } from "@/lib/zod/schemas/groups";
import { X } from "@/ui/shared/icons";
import { Button, Combobox, LoadingSpinner, Table, useTable } from "@dub/ui";
import { cn, OG_AVATAR_URL } from "@dub/utils";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import { z } from "zod";

type FormData = z.input<typeof updateGroupSchema>;

export function GroupPartners() {
  const { group, loading, mutateGroup } = useGroup();

  if (!group || loading) {
    return <LoadingSpinner />;
  }

  return <GroupPartnersForm group={group} mutateGroup={mutateGroup} />;
}

function GroupPartnersForm({
  group,
  mutateGroup,
}: {
  group: GroupProps;
  mutateGroup: () => void;
}) {
  const { makeRequest: updateGroup, isSubmitting } = useApiMutation();

  const [partnerIdsToRemove, setPartnerIdsToRemove] = useState<string[]>([]);
  const [partnerIdsToAdd, setPartnerIdsToAdd] = useState<string[]>([]);

  console.log({ partnerIdsToRemove, partnerIdsToAdd });

  const isDirty = partnerIdsToRemove.length > 0 || partnerIdsToAdd.length > 0;

  const onSubmit = async () => {
    if (!group) return;

    await updateGroup(`/api/groups/${group.id}/partners`, {
      method: "POST",
      body: {},
      onSuccess: async () => {
        toast.success("Partners updated successfully!");

        await mutateGroup();
      },
    });
  };

  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  // Partners already in the group
  const { partners: groupPartners, loading: groupPartnersLoading } =
    usePartners({
      query: {
        groupId: group.id,
      },
    });

  // Filtered partners for the combobox
  const { partners: searchPartners, loading } = usePartners({
    query: {
      search: debouncedSearch,
    },
  });

  const [cachedPartners, setCachedPartners] = useState<EnrolledPartnerProps[]>(
    [],
  );

  useEffect(() => {
    const allPartners = [...(groupPartners || []), ...(searchPartners || [])];
    if (!allPartners.length) return;

    setCachedPartners((cached) => [
      ...cached,
      ...allPartners.filter((p) => !cached.find((c) => c.id === p.id)),
    ]);
  }, [groupPartners, searchPartners]);

  // Partner IDs currently selected to be in the group (both existing + new)
  const selectedPartnerIds = useMemo(
    () =>
      [
        ...(groupPartners || []).map(({ id }) => id),
        ...partnerIdsToAdd.filter(
          (id) => !groupPartners?.find((gp) => gp.id === id),
        ),
      ].filter((id) => !partnerIdsToRemove.includes(id)),
    [groupPartners, partnerIdsToAdd, partnerIdsToRemove],
  );

  const selectedPartners = useMemo(
    () =>
      selectedPartnerIds
        .map((id) => cachedPartners.find((p) => p.id === id))
        .filter((p): p is EnrolledPartnerProps => Boolean(p)),
    [selectedPartnerIds, cachedPartners],
  );

  const partnersOptions = useMemo(
    () => (searchPartners || []).map(getPartnerOption),
    [searchPartners],
  );

  const table = useTable({
    data: selectedPartners,
    columns: [
      {
        header: "Partner",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <img
              src={row.original.image || `${OG_AVATAR_URL}${row.original.name}`}
              alt={row.original.name}
              className="size-6 shrink-0 rounded-full"
            />
            <span className="truncate text-sm text-neutral-700">
              {row.original.name}
            </span>
          </div>
        ),
        size: 180,
        minSize: 180,
        maxSize: 180,
      },
      {
        header: "Email",
        cell: ({ row }) => (
          <div className="truncate text-sm text-neutral-600">
            {row.original.email}
          </div>
        ),
        size: 160,
        minSize: 160,
        maxSize: 160,
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              variant="secondary"
              icon={<X className="size-4" />}
              className="size-4 rounded-md border-0 bg-neutral-50 p-0 hover:bg-neutral-100"
              onClick={() => {
                setPartnerIdsToRemove((prev) =>
                  prev.includes(row.original.id)
                    ? prev
                    : [...prev, row.original.id],
                );
              }}
            />
          </div>
        ),
        size: 50,
        minSize: 50,
        maxSize: 50,
      },
    ],
    thClassName: () => cn("border-l-0"),
    tdClassName: () => cn("border-l-0"),
    className: "[&_tr:last-child>td]:border-b-transparent",
    containerClassName: "rounded-md",
    scrollWrapperClassName: "min-h-[40px]",
    emptyWrapperClassName: "h-24",
    resourceName: (p) => `partner${p ? "s" : ""}`,
    getRowId: (row: EnrolledPartnerProps) => row.id,
    loading,
    rowCount: selectedPartners?.length || 0,
  });

  return (
    <div className="rounded-lg border border-neutral-200 p-5">
      <div className="flex items-start justify-between">
        <h2 className="text-content-emphasis mb-4 text-base font-semibold">
          Group partners
        </h2>
        <Button
          text="Save changes"
          className="h-8 w-fit"
          loading={isSubmitting}
          disabled={!isDirty}
        />
      </div>
      <div className="flex flex-col gap-3">
        <Combobox
          options={partnersOptions}
          selected={partnersOptions.filter((p) =>
            selectedPartners?.find((gp) => gp.id === p.value),
          )}
          onSelect={({ value: id }) => {
            if (selectedPartners.find((p) => p.id === id)) {
              // Partner is already selected: remove it
              setPartnerIdsToRemove((prev) =>
                prev.includes(id) ? prev : [...prev, id],
              );
              setPartnerIdsToAdd((prev) => prev.filter((pid) => pid !== id));
            } else {
              // Partner is not selected: add it
              setPartnerIdsToAdd((prev) =>
                prev.includes(id) ? prev : [...prev, id],
              );
              setPartnerIdsToRemove((prev) => prev.filter((pid) => pid !== id));
            }
          }}
          caret
          placeholder="Select partners"
          searchPlaceholder="Search partners by name"
          matchTriggerWidth
          multiple
          shouldFilter={false}
          onSearchChange={setSearch}
          buttonProps={{
            className: cn(
              "w-full justify-start border-neutral-200 px-3",
              "data-[state=open]:ring-1 data-[state=open]:ring-neutral-500 data-[state=open]:border-neutral-500",
              "focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-none",
              !selectedPartners.length && "text-neutral-400",
            ),
          }}
        >
          Select partners...
        </Combobox>

        <Table {...table} />
      </div>
    </div>
  );
}

const getPartnerOption = (partner: EnrolledPartnerProps) => ({
  icon: (
    <img
      alt={partner.name}
      src={partner.image || `${OG_AVATAR_URL}${partner.name}`}
      className="mr-1.5 size-4 shrink-0 rounded-full"
    />
  ),
  value: partner.id,
  label: partner.name,
});
