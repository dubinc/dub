type OrderableOption = {
  value: string;
  first?: boolean;
};

/**
 * Selected options move to the top when the menu closes, after any option
 * marked `first`. Pass `preserveOrder` to keep the caller's order instead.
 * A selection that isn't in `options` is still appended so it stays visible.
 * A non-empty search always keeps the incoming order so filtering stays stable.
 */
export function orderComboboxOptions<T extends OrderableOption>(
  options: T[],
  selected: T[],
  search: string,
  preserveOrder = false,
): T[] {
  if (search !== "") return options;

  if (preserveOrder) {
    const missingSelected = selected.filter(
      (option) =>
        !options.some((candidate) => candidate.value === option.value),
    );

    return missingSelected.length > 0
      ? [...options, ...missingSelected]
      : options;
  }

  return [
    ...options.filter(
      (option) =>
        option.first && !selected.some((s) => s.value === option.value),
    ),
    ...selected,
    ...options.filter(
      (option) =>
        !option.first && !selected.some((s) => s.value === option.value),
    ),
  ];
}
