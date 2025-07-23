// all event types
export enum EAnalyticEvents {
  PAGE_CLICKED = "pageClicked",
  PAGE_VIEWED = "pageViewed",

  ELEMENT_CLICKED = "elementClicked",
  ELEMENT_OPENED = "elementOpened",

  SIGNUP_ATTEMPT = "signupAttempt",
  SIGNUP_SUCCESS = "signupSuccess",

  LOGIN_ATTEMPT = "loginAttempt",
  LOGIN_SUCCESS = "loginSuccess",

  PURCHASE_ATTEMPT = "purchaseAttempt",
  PURCHASE_SUCCESS = "purchaseSuccess",
  PURCHASE_ERROR = "purchaseError",

  TRIAL_EXPIRED = "trialExpired",

  ACCOUNT_UPDATED = "accountUpdated",

  PLAN_PICKER_CLICKED = "planPickerClicked",

  EXPERIMENT_VIEWED = "experimentViewed",
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
