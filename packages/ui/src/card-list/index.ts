import { CardList as CardListComponent, CardListContext } from "./card-list";
import { CardContext, CardListCard } from "./card-list-card";
import { CardListPagination } from "./card-list-pagination";

const CardList = Object.assign(CardListComponent, {
  Card: Object.assign(CardListCard, {
    Context: CardContext,
  }),
  Context: CardListContext,
  Pagination: CardListPagination,
});

export { CardList };
