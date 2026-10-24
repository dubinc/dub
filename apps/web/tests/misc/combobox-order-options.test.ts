import { describe, expect, it } from "vitest";
import { orderComboboxOptions } from "../../../../packages/ui/src/combobox/order-options";

const options = [
  { value: "a", label: "A", first: true },
  { value: "b", label: "B" },
  { value: "c", label: "C" },
  { value: "d", label: "D" },
];

describe("orderComboboxOptions", () => {
  it("moves the selection to the top, after options marked first", () => {
    expect(
      orderComboboxOptions(options, [{ value: "c", label: "C" }], ""),
    ).toEqual([
      { value: "a", label: "A", first: true },
      { value: "c", label: "C" },
      { value: "b", label: "B" },
      { value: "d", label: "D" },
    ]);
  });

  it("keeps the incoming order while a search is active", () => {
    expect(
      orderComboboxOptions(options, [{ value: "c", label: "C" }], "b"),
    ).toEqual(options);
  });

  it("keeps the caller's order when preserveOrder is set", () => {
    expect(
      orderComboboxOptions(options, [{ value: "c", label: "C" }], "", true),
    ).toBe(options);
  });

  it("appends a selection that is missing from the options without reordering", () => {
    expect(
      orderComboboxOptions(options, [{ value: "z", label: "Z" }], "", true),
    ).toEqual([...options, { value: "z", label: "Z" }]);
  });

  it("still shows a selection that is missing from the options", () => {
    expect(
      orderComboboxOptions(options, [{ value: "z", label: "Z" }], ""),
    ).toEqual([
      { value: "a", label: "A", first: true },
      { value: "z", label: "Z" },
      { value: "b", label: "B" },
      { value: "c", label: "C" },
      { value: "d", label: "D" },
    ]);
  });
});
