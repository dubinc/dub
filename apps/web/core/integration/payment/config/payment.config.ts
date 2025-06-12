import { ICustomerBody, IPaymentPlanPrice } from "./payment-config.interface";

const ONE_MONTH_IN_DAYS = 28;

// price config
export const priceConfig = {
  QUARTERLY_PLAN_CHARGE_PERIOD_DAYS: ONE_MONTH_IN_DAYS * 3,
  HALF_YEARLY_PLAN_CHARGE_PERIOD_DAYS: ONE_MONTH_IN_DAYS * 6,
  YEARLY_PLAN_CHARGE_PERIOD_DAYS: ONE_MONTH_IN_DAYS * 12,
  paymentPlan: {
    DEFAULT: {
      MIN_PRICE: 50,
      PRICE_QUARTER_PLAN: 3999 * 3,
      PRICE_HALF_YEAR_PLAN: 2999 * 6,
      PRICE_HALF_YEAR_PLAN_PREV: 3999 * 6,
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
    QUARTERLY_PLAN_CHARGE_PERIOD_DAYS:
      priceConfig.QUARTERLY_PLAN_CHARGE_PERIOD_DAYS,
    HALF_YEARLY_PLAN_CHARGE_PERIOD_DAYS:
      priceConfig.HALF_YEARLY_PLAN_CHARGE_PERIOD_DAYS,
    YEARLY_PLAN_CHARGE_PERIOD_DAYS: priceConfig.YEARLY_PLAN_CHARGE_PERIOD_DAYS,
    priceForPay,
    priceForView,
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
