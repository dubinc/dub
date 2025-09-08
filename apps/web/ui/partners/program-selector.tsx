import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import { Combobox, ComboboxProps } from "@dub/ui";
import { cn, OG_AVATAR_URL } from "@dub/utils";
import { useMemo, useState } from "react";

type ProgramSelectorProps = {
  selectedProgramSlug: string | null;
  setSelectedProgramSlug: (programSlug: string) => void;
  disabled?: boolean;
} & Partial<ComboboxProps<false, any>>;

export function ProgramSelector({
  selectedProgramSlug,
  setSelectedProgramSlug,
  disabled,
  ...rest
}: ProgramSelectorProps) {
  const [openPopover, setOpenPopover] = useState(false);

  const { programEnrollments, isLoading } = useProgramEnrollments({
    status: "approved",
  });

  const programOptions = useMemo(() => {
    return programEnrollments?.map(({ program }) => ({
      value: program.slug,
      label: program.name,
      icon: (
        <img
          src={program.logo || `${OG_AVATAR_URL}${program.name}`}
          className="size-4 rounded-full"
        />
      ),
    }));
  }, [programEnrollments]);

  const selectedOption = useMemo(() => {
    if (!selectedProgramSlug) return null;

    const program = programEnrollments?.find(
      ({ program }) => program.slug === selectedProgramSlug,
    )?.program;

    if (!program) return null;

    return {
      value: program.slug,
      label: program.name,
      icon: (
        <img
          src={program.logo || `${OG_AVATAR_URL}${program.name}`}
          className="size-4 rounded-full"
        />
      ),
    };
  }, [programEnrollments, selectedProgramSlug]);

  return (
    <Combobox
      options={isLoading ? undefined : programOptions}
      setSelected={(option) => {
        if (!option) return;
        setSelectedProgramSlug(option.value);
      }}
      selected={selectedOption}
      icon={selectedOption?.icon}
      caret={true}
      placeholder="Select program"
      searchPlaceholder="Search program..."
      matchTriggerWidth
      open={openPopover}
      onOpenChange={setOpenPopover}
      buttonProps={{
        disabled,
        className: cn(
          "w-full justify-start border-neutral-300 px-3",
          "data-[state=open]:ring-1 data-[state=open]:ring-neutral-500 data-[state=open]:border-neutral-500",
          "focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-none",
        ),
      }}
      {...rest}
    >
      {selectedOption?.label}
    </Combobox>
  );
}
