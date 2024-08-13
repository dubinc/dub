// Beta version
export interface IntegrationAdapter {
  install(): Promise<void>;
  uninstall(): Promise<void>;
  getCredentials(): Promise<any>;
}
