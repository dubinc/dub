import { categories, categoriesMap } from "@/lib/partners/categories";
import { Combobox, ComboboxProps } from "@dub/ui";
import { Category } from "@prisma/client";

export function ProgramCategorySelect({
  selected,
  onChange,
  ...rest
}: {
  selected: Category | null;
  onChange: (category: Category | null) => void;
} & Omit<ComboboxProps<false, any>, "selected" | "options" | "onSelect">) {
  const selectedCategory = selected ? categoriesMap?.[selected] : null;

  return (
    <Combobox
      options={categories.map(({ id, label, icon }) => ({
        value: id,
        label,
        icon,
      }))}
      selected={
        selected
          ? {
              value: selected,
              label: selectedCategory?.label ?? selected.replaceAll("_", " "),
              icon: selectedCategory?.icon,
            }
          : null
      }
      onSelect={(option) => onChange(option?.value as Category | null)}
      caret
      matchTriggerWidth
      {...rest}
    />
  );
}
