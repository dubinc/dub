import {
  ICustomerBody,
  IPaymentPlanPrice,
  TPaymentPlan,
} from "./payment-config.interface";

const ONE_MONTH_IN_DAYS = 28;

// price config
export const priceConfig = {
  TRIAL_PERIOD_DAYS: 7,
  MONTHLY_PLAN_CHARGE_PERIOD_DAYS: ONE_MONTH_IN_DAYS,
  QUARTERLY_PLAN_CHARGE_PERIOD_DAYS: ONE_MONTH_IN_DAYS * 3,
  YEARLY_PLAN_CHARGE_PERIOD_DAYS: 365,
  paymentPlan: {
    DEFAULT: {
      MIN_PRICE: 50,
      PRICE_TRIAL_MONTH_PLAN: 99,
      PRICE_MONTH_PLAN: 3999,
      PRICE_QUARTER_PLAN: 2999 * 3,
      PRICE_QUARTER_PLAN_PREV: 3999 * 3,
      PRICE_YEAR_PLAN: 1999 * 12,
      PRICE_YEAR_PLAN_PREV: 3999 * 12,
    },
  },
};

// get payment plan price
export const getPaymentPlanPrice = (props: IPaymentPlanPrice) => {
  const { paymentPlan, user } = props;

  const type = "DEFAULT";

  const currentPrice =
    priceConfig.paymentPlan[type][
      paymentPlan as keyof (typeof priceConfig.paymentPlan)[typeof type]
    ];

  const excludeCurrencies = ["USD", "EUR", "GBP"];

  const currencyForPay = user?.currency?.currencyForPay || "USD";
  const exchangeForPay = excludeCurrencies.includes(currencyForPay)
    ? 1
    : Number(user?.currency?.eurExchangeRate?.toFixed(2) || 1);
  const priceForPay = excludeCurrencies.includes(currencyForPay)
    ? currentPrice
    : Math.ceil(
        (Number(
          (Math.floor(currentPrice * exchangeForPay) / 100)
            .toString()
            .split(".")
            ?.at(0),
        ) +
          0.99) *
          100,
      );

  const currencyForView = user?.currency?.currencyCode || "USD";
  const exchangeForView = excludeCurrencies.includes(currencyForView)
    ? 1
    : Number(user?.currency?.eurExchangeRate?.toFixed(2) || 1);
  const priceForView = excludeCurrencies.includes(currencyForView)
    ? currentPrice / 100
    : Number(
        Math.floor((currentPrice * exchangeForView) / 100)
          .toString()
          .split(".")
          ?.at(0),
      ) + 0.99;

  // return
  return {
    MONTHLY_PLAN_CHARGE_PERIOD_DAYS:
      priceConfig.MONTHLY_PLAN_CHARGE_PERIOD_DAYS,
    QUARTERLY_PLAN_CHARGE_PERIOD_DAYS:
      priceConfig.QUARTERLY_PLAN_CHARGE_PERIOD_DAYS,
    YEARLY_PLAN_CHARGE_PERIOD_DAYS: priceConfig.YEARLY_PLAN_CHARGE_PERIOD_DAYS,
    priceForPay,
    priceForView,
    trialPeriodDays: priceConfig.TRIAL_PERIOD_DAYS,
  };
};

// get sale
export const getSale = (oldPrice: number, newPrice: number) => {
  const sail = ((oldPrice - newPrice) / oldPrice) * 100;
  return `${Math.floor(sail)}`;
};

// get calculate price for view
export const getCalculatePriceForView = (
  value: number,
  user: ICustomerBody | null,
) => {
  const price = String(value);

  const generatePrice =
    String(price).split(".")?.at(0) +
    "." +
    (price.split(".")?.at(1)?.slice(0, 2) || "00");

  return user?.currency?.symbolAtStart === "TRUE"
    ? `${user?.currency?.currencySymbol}${generatePrice}`
    : `${generatePrice}${user?.currency?.currencySymbol}`;
};

// get calculate price for pay
export const getCalculatePriceForPay = (
  value: number,
  user: ICustomerBody | null,
) => {
  const price = String(value / 100);

  const generatePrice =
    String(price).split(".")?.at(0) +
    "." +
    (price.split(".")?.at(1)?.slice(0, 2) || "00");

  return `${generatePrice} ${user?.currency?.currencyForPay}`;
};

// get charge period days by plan
export const getChargePeriodDaysIdByPlan = ({
  user,
  paymentPlan,
}: {
  user: ICustomerBody;
  paymentPlan: TPaymentPlan;
}) => {
  const {
    MONTHLY_PLAN_CHARGE_PERIOD_DAYS,
    QUARTERLY_PLAN_CHARGE_PERIOD_DAYS,
    YEARLY_PLAN_CHARGE_PERIOD_DAYS,
  } = getPaymentPlanPrice({ paymentPlan: "MIN_PRICE", user }); //MIN_PRICE is plug

  const periodIdsByPlan = {
    PRICE_MONTH_PLAN: MONTHLY_PLAN_CHARGE_PERIOD_DAYS,
    PRICE_QUARTER_PLAN: QUARTERLY_PLAN_CHARGE_PERIOD_DAYS,
    PRICE_YEAR_PLAN: YEARLY_PLAN_CHARGE_PERIOD_DAYS,
  };

  return periodIdsByPlan[paymentPlan];
};
