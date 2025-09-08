// all event types
export enum EAnalyticEvents {
  PAGE_CLICKED = "pageClicked",
  PAGE_VIEWED = "pageViewed",

  ELEMENT_CLICKED = "elementClicked",
  ELEMENT_OPENED = "elementOpened",

  AUTH_ATTEMPT = "authAttempt",
  AUTH_SUCCESS = "authSuccess",
  AUTH_ERROR = "authError",

  PURCHASE_ATTEMPT = "purchaseAttempt",
  PURCHASE_SUCCESS = "purchaseSuccess",
  PURCHASE_ERROR = "purchaseError",

  TRIAL_EXPIRED = "trialExpired",

  ACCOUNT_UPDATED = "accountUpdated",

  PLAN_PICKER_CLICKED = "planPickerClicked",

  QR_CREATED = "qrCreated",
  QR_UPDATED = "qrUpdated",

  EXPERIMENT_VIEWED = "experimentViewed",

  IDENTIFY_EVENT = "identifyEvent",
}

// purchase related events
export interface IPurchaseEventTracking {
  flow_type?: string | null;
  one_time_purchase_type?: string | null;
  plan_code?: string | null;
  currency?: string | null;
  amount?: number | null;
  payment_method?: string | null;
  payment_processor?: string | null;
  user_id?: string | null;
  customer_id?: string | null;
  payment_id?: string | null;
  subscription_id?: string | null;
  mixpanel_user_id?: string | null;
  email?: string | null;
  language?: string | null;
  country?: string | null;
}

// purchase event
export interface IPurchaseErrorEvent extends IPurchaseEventTracking {
  error_code: string | null;
}

// email submit event
export interface IEmailSubmitEvent {
  email: string;
  language?: string;
  mixpanel_user_id?: string;
  promo?: string;
  country?: string;
}

//  link or btn leading to another page clicked event
export interface IPageClickedTracking {
  page_title?: string;
  page_name?: string;
  page_number?: number;
  content_group?: string;
  content_answer?: string;
}

// QR events tracking
export interface IQREventTracking {
  email?: string;
  qrId?: string;
  qrType?: "website" | "pdf" | "whatsapp" | "wifi" | "image" | "video";
  qrFrame?: string;
  qrText?: string;
  qrFrameColour?: string;
  qrTextColour?: string;
  qrStyle?: string;
  qrBorderColour?: string;
  qrBorderStyle?: string;
  qrCenterStyle?: string;
  qrLogo?: string;
  qrLogoUpload?: boolean;
}
