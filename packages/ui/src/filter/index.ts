import { FilterList } from "./filter-list";
import { FilterSelect } from "./filter-select";

const Filter = { Select: FilterSelect, List: FilterList };

export { Filter };
export type { FilterOperator, ActiveFilter, Filter as FilterType, FilterOption } from "./types";
