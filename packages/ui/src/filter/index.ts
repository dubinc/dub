import { FilterList } from "./filter-list";
import { FilterSelect } from "./filter-select";

const Filter = { Select: FilterSelect, List: FilterList };

export { normalizeActiveFilter } from "./types";
export type {
  ActiveFilter,
  ActiveFilterInput,
  FilterOperator,
  FilterOption,
  Filter as FilterType,
  LegacyActiveFilterPlural,
  LegacyActiveFilterSingular,
} from "./types";
export { Filter };
