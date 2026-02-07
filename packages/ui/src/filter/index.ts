import { FilterList } from "./filter-list";
import { FilterSelect } from "./filter-select";

const Filter = { Select: FilterSelect, List: FilterList };

export { Filter };
export type { 
  FilterOperator, 
  ActiveFilter, 
  ActiveFilterInput,
  LegacyActiveFilterSingular,
  LegacyActiveFilterPlural,
  Filter as FilterType, 
  FilterOption 
} from "./types";
export { normalizeActiveFilter } from "./types";
