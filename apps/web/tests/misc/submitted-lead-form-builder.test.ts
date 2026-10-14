import { getGroupSubmittedLeadForm } from "@/lib/submitted-leads/get-group-submitted-lead-form";
import { formFieldSchema } from "@/lib/zod/schemas/submitted-lead-form";
import {
  changeLeadFormBuilderFieldType,
  createLeadFormBuilderField,
  LeadFormBuilderField,
  parseLeadFormBuilderFields,
  toLeadFormBuilderField,
} from "@/ui/submitted-leads/form-builder/lead-form-builder-fields";
import { describe, expect, it } from "vitest";
import * as z from "zod/v4";

type FormField = z.infer<typeof formFieldSchema>;

const common = {
  required: false,
  locked: false,
};

const STORED_FIELDS: FormField[] = [
  {
    ...common,
    key: "department",
    label: "Department",
    type: "text",
    position: 0,
    constraints: { maxLength: 100, pattern: "^[a-z]+$" },
  },
  {
    ...common,
    key: "notes",
    label: "Notes",
    type: "textarea",
    position: 1,
    constraints: { maxLength: 500 },
  },
  {
    ...common,
    key: "size",
    label: "Company size",
    type: "select",
    position: 2,
    required: true,
    options: [
      { value: "small", label: "1-50" },
      { value: "large", label: "51+" },
    ],
  },
  {
    ...common,
    key: "products",
    label: "Products",
    type: "multiSelect",
    position: 3,
    options: [
      { value: "links", label: "Links" },
      { value: "partners", label: "Partners" },
    ],
    multiple: true,
  },
  {
    ...common,
    key: "seats",
    label: "Seats",
    type: "number",
    position: 4,
    constraints: { min: 1, max: 100 },
  },
  { ...common, key: "website", label: "Website", type: "url", position: 5 },
  { ...common, key: "start", label: "Start date", type: "date", position: 6 },
  { ...common, key: "country", label: "Country", type: "country", position: 7 },
];

function builderField(
  overrides: Partial<LeadFormBuilderField> = {},
): LeadFormBuilderField {
  return {
    ...createLeadFormBuilderField(),
    type: "text",
    label: "Field",
    ...overrides,
  };
}

describe("lead form builder fields", () => {
  it("keeps every stored field the same after a round trip", () => {
    const result = parseLeadFormBuilderFields(
      STORED_FIELDS.map(toLeadFormBuilderField),
    );

    expect(result).toEqual({ success: true, fields: STORED_FIELDS });
  });

  it("opens a stored phone field as a text field", () => {
    const result = parseLeadFormBuilderFields([
      toLeadFormBuilderField({
        ...common,
        key: "phone",
        label: "Phone",
        type: "phone",
        position: 0,
        required: true,
      }),
    ]);

    expect(result).toEqual({
      success: true,
      fields: [
        {
          ...common,
          key: "phone",
          label: "Phone",
          type: "text",
          position: 0,
          required: true,
        },
      ],
    });
  });

  it("allows multiple selections for older multiple choice fields", () => {
    const field = toLeadFormBuilderField({
      ...common,
      key: "products",
      label: "Products",
      type: "multiSelect",
      position: 0,
      options: [
        { value: "links", label: "Links" },
        { value: "partners", label: "Partners" },
      ],
    });

    expect(field.multiple).toBe(true);
  });

  it("starts new multiple choice fields with a single choice", () => {
    const changed = changeLeadFormBuilderFieldType(
      builderField(),
      "multiSelect",
    );

    expect(changed.multiple).toBe(false);
  });

  it("sets the position from the order and unlocks custom fields", () => {
    const result = parseLeadFormBuilderFields([
      builderField({ key: "b", label: "B" }),
      builderField({ key: "a", label: "A" }),
    ]);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(
      result.fields.map(({ key, position, locked }) => ({
        key,
        position,
        locked,
      })),
    ).toEqual([
      { key: "b", position: 0, locked: false },
      { key: "a", position: 1, locked: false },
    ]);
  });

  it("trims labels", () => {
    const result = parseLeadFormBuilderFields([
      builderField({ label: "  Department  " }),
    ]);

    expect(result.success && result.fields[0].label).toBe("Department");
  });

  it("rejects a field without an input type", () => {
    const field = builderField({ type: null });

    expect(parseLeadFormBuilderFields([field])).toEqual({
      success: false,
      key: field.key,
      message: "Select an input type for each field.",
    });
  });

  it("rejects a field without a label", () => {
    const field = builderField({ label: "   " });

    expect(parseLeadFormBuilderFields([field])).toEqual({
      success: false,
      key: field.key,
      message: "Enter a label for each field.",
    });
  });

  it("rejects a dropdown with less than two options", () => {
    const field = builderField({
      type: "select",
      label: "Size",
      options: [{ value: "a", label: "Small" }],
    });

    expect(parseLeadFormBuilderFields([field])).toEqual({
      success: false,
      key: field.key,
      message: "Size: Add at least two options.",
    });
  });

  it("rejects an option without a label", () => {
    const field = builderField({
      type: "multiSelect",
      label: "Products",
      options: [
        { value: "a", label: "Links" },
        { value: "b", label: " " },
      ],
    });

    expect(parseLeadFormBuilderFields([field])).toEqual({
      success: false,
      key: field.key,
      message: "Products: Enter a label for each option.",
    });
  });

  it("rejects max characters that are not a whole number of at least 1", () => {
    for (const maxLength of [0, 1.5, NaN]) {
      const result = parseLeadFormBuilderFields([builderField({ maxLength })]);

      expect(result.success).toBe(false);
    }
  });

  it("rejects a minimum that is more than the maximum", () => {
    const field = builderField({
      type: "number",
      label: "Seats",
      min: 10,
      max: 5,
    });

    expect(parseLeadFormBuilderFields([field])).toEqual({
      success: false,
      key: field.key,
      message: "Seats: The minimum can't be more than the maximum.",
    });
  });

  it("returns the first field with a problem", () => {
    const valid = builderField({ key: "valid" });
    const invalid = builderField({ key: "invalid", label: "" });

    const result = parseLeadFormBuilderFields([valid, invalid, valid]);

    expect(result.success === false && result.key).toBe("invalid");
  });

  it("keeps only the label and required when the type changes", () => {
    const field = builderField({
      type: "select",
      label: "Size",
      required: true,
      options: [
        { value: "a", label: "Small" },
        { value: "b", label: "Large" },
      ],
    });

    const changed = changeLeadFormBuilderFieldType(field, "number");

    expect(changed).toMatchObject({
      key: field.key,
      type: "number",
      label: "Size",
      required: true,
      options: [],
      maxLength: null,
      min: null,
      max: null,
    });
  });

  it("adds two empty options when the type changes to a choice type", () => {
    const changed = changeLeadFormBuilderFieldType(builderField(), "select");

    expect(changed.options).toHaveLength(2);
    expect(changed.options.every(({ label }) => label === "")).toBe(true);
  });
});

describe("getGroupSubmittedLeadForm", () => {
  const submittedLeadFormData = { fields: STORED_FIELDS };

  it("returns null without a group", () => {
    expect(getGroupSubmittedLeadForm(null)).toBeNull();
    expect(getGroupSubmittedLeadForm(undefined)).toBeNull();
  });

  it("returns null when the form is turned off", () => {
    expect(
      getGroupSubmittedLeadForm({
        submittedLeadFormData,
        submittedLeadsEnabledAt: null,
      }),
    ).toBeNull();
  });

  it("returns null when the form is turned on but missing", () => {
    expect(
      getGroupSubmittedLeadForm({
        submittedLeadFormData: null,
        submittedLeadsEnabledAt: new Date(),
      }),
    ).toBeNull();
  });

  it("returns null when the stored form is not valid", () => {
    expect(
      getGroupSubmittedLeadForm({
        submittedLeadFormData: { fields: [{ key: "a" }] },
        submittedLeadsEnabledAt: new Date(),
      }),
    ).toBeNull();
  });

  it("returns the form when it is turned on and valid", () => {
    expect(
      getGroupSubmittedLeadForm({
        submittedLeadFormData,
        submittedLeadsEnabledAt: "2026-10-07T00:00:00.000Z",
      }),
    ).toEqual(submittedLeadFormData);
  });

  it("accepts a form with only the required fields", () => {
    expect(
      getGroupSubmittedLeadForm({
        submittedLeadFormData: { fields: [] },
        submittedLeadsEnabledAt: new Date(),
      }),
    ).toEqual({ fields: [] });
  });
});
