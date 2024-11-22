export interface DubEmbedProps {
  linkToken: string;
  onTokenExpired?: () => void;
  url?: string;
}
