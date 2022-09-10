export interface LinkProps {
  key: string;
  url: string;
  title: string;
  timestamp: number;
}

export interface ProjectProps {
  name: string;
  slug: string;
  verified: boolean;
  links: LinkProps[];
}
