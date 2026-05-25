import { FilterList } from "./filter-list";
import { FilterSelect } from "./filter-select";
import { FilterSidebar } from "./filter-sidebar";

const Filter = {
  Select: FilterSelect,
  List: FilterList,
  Sidebar: FilterSidebar,
};

export { encodeRangeToken, parseRangeToken } from "./types";
export type {
  ActiveFilterInput,
  Filter as FilterConfig,
  FilterOption,
} from "./types";
export { Filter };
