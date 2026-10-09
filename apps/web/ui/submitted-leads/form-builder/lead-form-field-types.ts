import {
  CalendarIcon,
  CheckboxChecked,
  DropdownSelect,
  Globe,
  Hashtag,
  Icon,
  InputField,
  LinkChain,
  TextArea,
} from "@dub/ui/icons";
import { LeadFormFieldType } from "./lead-form-builder-fields";

export const LEAD_FORM_FIELD_TYPES: Record<
  LeadFormFieldType,
  {
    label: string;
    icon: Icon;
  }
> = {
  text: { label: "Text field", icon: InputField },
  textarea: { label: "Text area", icon: TextArea },
  date: { label: "Date selection", icon: CalendarIcon },
  url: { label: "URL", icon: LinkChain },
  select: { label: "Dropdown", icon: DropdownSelect },
  country: { label: "Country", icon: Globe },
  multiSelect: { label: "Multiple choice", icon: CheckboxChecked },
  number: { label: "Number", icon: Hashtag },
};
