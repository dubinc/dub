import { MAX_PROGRAM_CATEGORIES } from "@/lib/constants/program";
import { categories, categoriesMap } from "@/lib/partners/categories";
import { Combobox, ComboboxProps } from "@dub/ui";
import { Category } from "@prisma/client";

export function ProgramCategorySelect({
  selected,
  onChange,
  ...rest
}: {
  selected: Category[];
  onChange: (categories: Category[]) => void;
} & Omit<ComboboxProps<false, any>, "selected" | "options" | "onSelect">) {
  return (
    <Combobox
      multiple
      maxSelected={MAX_PROGRAM_CATEGORIES}
      options={categories.map(({ id, label, icon }) => ({
        value: id,
        label,
        icon,
      }))}
      selected={selected.map((category) => {
        const { label, icon } = categoriesMap[category] ?? {
          label: category.replaceAll("_", " "),
          icon: undefined,
        };

        return {
          value: category,
          label,
          icon,
        };
      })}
      setSelected={(options) =>
        onChange(options.map(({ value }) => value as Category))
      }
      caret
      matchTriggerWidth
      {...rest}
    />
  );
}
