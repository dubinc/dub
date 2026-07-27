"use client";

const MAX_DISPLAYED = 1;

interface CampaignRecipientsSelectorProps {
  selectedGroupIds: string[] | null;
  setSelectedGroupIds: (groupIds: string[] | null) => void;
  selectedPartnerTagIds: string[] | null;
  setSelectedPartnerTagIds: (tagIds: string[] | null) => void;
}

export function CampaignRecipientsSelector({
  selectedGroupIds,
  setSelectedGroupIds,
  selectedPartnerTagIds,
  setSelectedPartnerTagIds,
}: CampaignRecipientsSelectorProps) {
  // const { groups, loading: groupsLoading } = useGroups();
  // const { partnerTags, isLoading: tagsLoading } = usePartnerTags();
  // const [openPopover, setOpenPopover] = useState(false);

  // const selectedGroups = useMemo(() => {
  //   if (!selectedGroupIds?.length || !groups) {
  //     return [];
  //   }

  //   return groups.filter((group) => selectedGroupIds.includes(group.id));
  // }, [groups, selectedGroupIds]);

  // const selectedTags = useMemo(() => {
  //   if (!selectedPartnerTagIds?.length || !partnerTags) {
  //     return [];
  //   }

  //   return partnerTags.filter((tag) => selectedPartnerTagIds.includes(tag.id));
  // }, [partnerTags, selectedPartnerTagIds]);

  // const hasGroupFilter = Boolean(selectedGroupIds?.length);
  // const hasTagFilter = Boolean(selectedPartnerTagIds?.length);
  // const isUnrestricted = !hasGroupFilter && !hasTagFilter;
  // const isLoading =
  //   (groupsLoading && hasGroupFilter) || (tagsLoading && hasTagFilter);

  // const groupPlusCount = Math.max(0, selectedGroups.length - MAX_DISPLAYED);
  // const tagPlusCount = Math.max(0, selectedTags.length - MAX_DISPLAYED);

  // return (
  //   <Popover
  //     content={
  //       <div className="w-full p-3 sm:w-[440px]">
  //         <PartnerAudienceSelector
  //           selectedGroupIds={selectedGroupIds}
  //           setSelectedGroupIds={setSelectedGroupIds}
  //           selectedPartnerTagIds={selectedPartnerTagIds}
  //           setSelectedPartnerTagIds={setSelectedPartnerTagIds}
  //         />
  //       </div>
  //     }
  //     align="start"
  //     openPopover={openPopover}
  //     setOpenPopover={setOpenPopover}
  //   >
  //     <div
  //       className={cn(
  //         "group relative flex h-8 w-full cursor-pointer items-center gap-2 rounded-lg p-1.5 text-sm transition-colors duration-150 hover:bg-neutral-100",
  //         openPopover && "bg-neutral-100",
  //       )}
  //       onClick={() => setOpenPopover(true)}
  //     >
  //       {isLoading ? (
  //         <div className="h-5 w-1/3 animate-pulse rounded bg-neutral-200" />
  //       ) : isUnrestricted ? (
  //         <div
  //           className={cn(
  //             "flex h-5 items-center gap-1 rounded-md px-1.5 transition-colors",
  //             openPopover
  //               ? "bg-neutral-200"
  //               : "bg-neutral-100 group-hover:bg-neutral-200",
  //           )}
  //         >
  //           <Users className="size-3.5 shrink-0" />
  //           <span className="text-content-default text-sm font-medium">
  //             All partners
  //           </span>
  //         </div>
  //       ) : (
  //         <div className="flex min-w-0 flex-1 items-center gap-2">
  //           {selectedGroups.slice(0, MAX_DISPLAYED).map((group) => (
  //             <div
  //               key={group.id}
  //               className={cn(
  //                 "flex h-5 min-w-0 items-center gap-1 rounded-md px-1.5 transition-colors",
  //                 openPopover
  //                   ? "bg-neutral-200"
  //                   : "bg-neutral-100 group-hover:bg-neutral-200",
  //               )}
  //             >
  //               <GroupColorCircle group={group} />
  //               <span className="text-content-default min-w-0 truncate text-sm font-medium">
  //                 {group.name}
  //               </span>
  //             </div>
  //           ))}

  //           {groupPlusCount > 0 && (
  //             <span
  //               className={cn(
  //                 "flex items-center rounded-md px-2 py-0.5 text-xs font-medium text-neutral-600 transition-colors",
  //                 openPopover
  //                   ? "bg-neutral-200"
  //                   : "bg-neutral-100 group-hover:bg-neutral-200",
  //               )}
  //             >
  //               +{groupPlusCount}
  //             </span>
  //           )}

  //           {selectedTags.slice(0, MAX_DISPLAYED).map((tag) => (
  //             <div
  //               key={tag.id}
  //               className={cn(
  //                 "flex h-5 min-w-0 items-center gap-1 rounded-md px-1.5 transition-colors",
  //                 openPopover
  //                   ? "bg-neutral-200"
  //                   : "bg-neutral-100 group-hover:bg-neutral-200",
  //               )}
  //             >
  //               <TagIcon className="size-3.5 shrink-0" />
  //               <span className="text-content-default min-w-0 truncate text-sm font-medium">
  //                 {tag.name}
  //               </span>
  //             </div>
  //           ))}

  //           {tagPlusCount > 0 && (
  //             <span
  //               className={cn(
  //                 "flex items-center rounded-md px-2 py-0.5 text-xs font-medium text-neutral-600 transition-colors",
  //                 openPopover
  //                   ? "bg-neutral-200"
  //                   : "bg-neutral-100 group-hover:bg-neutral-200",
  //               )}
  //             >
  //               +{tagPlusCount}
  //             </span>
  //           )}
  //         </div>
  //       )}

  //       <button
  //         type="button"
  //         className={cn(
  //           "ml-auto h-5 shrink-0 rounded-md bg-neutral-200 px-2 text-xs font-semibold text-neutral-700 transition-opacity",
  //           openPopover ? "opacity-100" : "opacity-0 group-hover:opacity-100",
  //         )}
  //         onClick={(e) => {
  //           e.stopPropagation();
  //           setOpenPopover(true);
  //         }}
  //       >
  //         Edit
  //       </button>
  //     </div>
  //   </Popover>
  // );

  return <></>;
}
