export interface SegmentSettingsProps {
  installed: {
    id: string;
  };
  credentials: {
    writeKey?: string;
  };
  webhookId?: string;
}
