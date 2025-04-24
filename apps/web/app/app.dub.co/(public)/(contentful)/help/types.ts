type AvailableLanguageTag = string;

export interface IInnerPage {
  id: string;
  title: string;
  titles: Record<AvailableLanguageTag, string>;
  link: string;
  slug: string;
}

export interface ISection {
  icon: string;
  title: string;
  titles: Record<AvailableLanguageTag, string>;
  pages: IInnerPage[];
}
