import { CardList as CardListComponent, CardListContext } from "./card-list";
import { CardListCard } from "./card-list-card";
import { CardListPagination } from "./card-list-pagination";

const CardList = Object.assign(CardListComponent, {
  Card: CardListCard,
  Context: CardListContext,
  Pagination: CardListPagination,
});

export { CardList };
