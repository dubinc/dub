import { CardList as CardListComponent, CardListContext } from "./card-list";
import { CardContext, CardListCard } from "./card-list-card";

const CardList = Object.assign(CardListComponent, {
  Card: Object.assign(CardListCard, {
    Context: CardContext,
  }),
  Context: CardListContext,
});

export { CardList };
