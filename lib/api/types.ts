export interface LinkProps {
  key: string;
  url: string;
}

export interface ProjectProps {
  name: string;
  slug: string;
  links: LinkProps[];
}
