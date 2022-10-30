import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import BlurImage from "@/components/shared/blur-image";
import LoadingDots from "@/components/shared/icons/loading-dots";
import Modal from "@/components/shared/modal";
import Slider from "@/components/shared/slider";
import Switch from "@/components/shared/switch";
import { getStripe } from "@/lib/stripe/client";
import { PRO_TIERS } from "@/lib/stripe/constants";
import { nFormatter } from "@/lib/utils";

function UpgradePlanModal({
  showUpgradePlanModal,
  setShowUpgradePlanModal,
}: {
  showUpgradePlanModal: boolean;
  setShowUpgradePlanModal: Dispatch<SetStateAction<boolean>>;
}) {
  const [clicked, setClicked] = useState(false);
  const [tier, setTier] = useState(0);
  const [annualBilling, setAnnualBilling] = useState(true);
  const period = useMemo(
    () => (annualBilling ? "yearly" : "monthly"),
    [annualBilling],
  );
  const env =
    process.env.NEXT_PUBLIC_VERCEL_ENV === "production" ? "production" : "test";

  return (
    <Modal
      showModal={showUpgradePlanModal}
      setShowModal={setShowUpgradePlanModal}
    >
      <div className="inline-block w-full transform overflow-hidden bg-white align-middle shadow-xl transition-all sm:max-w-md sm:rounded-2xl sm:border sm:border-gray-200">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 pt-8 pb-24 sm:px-16">
          <BlurImage
            src="/_static/logo.png"
            alt="Dub logo"
            className="h-10 w-10 rounded-full border border-gray-200"
            width={20}
            height={20}
          />
          <h3 className="text-xl font-medium">Upgrade to Pro</h3>
          <div className="flex items-center space-x-2">
            <p className="text-sm text-gray-600">Billed Monthly</p>
            <Switch fn={setAnnualBilling} />
            <p className="text-sm text-gray-600">Billed Annually</p>
          </div>
        </div>

        <div className="relative mx-auto -mt-[5.1rem] -mb-[5.3rem] max-w-sm rounded-lg border border-gray-200 bg-white shadow-md">
          {annualBilling && (
            <span className="absolute top-2 -right-0.5 rounded-l-md bg-gradient-to-r from-blue-600 to-cyan-600 px-2 py-0.5 text-xs text-white">
              2 Free Months
            </span>
          )}
          <div className="flex w-full max-w-md items-center justify-between p-5 pt-7">
            <h3 className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-2xl text-transparent">
              {PRO_TIERS[tier].name}
            </h3>
            <div className="flex items-center">
              <p className="text-2xl font-semibold text-gray-700">
                ${PRO_TIERS[tier].price[period].amount}
              </p>
              <p className="text-sm text-gray-700">
                /{annualBilling ? "yr" : "mo"}
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col items-center space-y-1 rounded-b-lg border-t border-gray-200 bg-gray-50 p-5 text-center">
            <Slider
              value={tier}
              setValue={setTier}
              maxValue={PRO_TIERS.length - 1}
            />
            <p className="text-sm text-gray-700">
              Up to {nFormatter(PRO_TIERS[tier].quota)} link clicks/mo
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center bg-gray-50 px-4 pt-28 pb-8 text-left sm:px-16">
          <button
            disabled={clicked}
            onClick={() => {
              setClicked(true);
              fetch(
                `/api/stripe/upgrade?priceId=${PRO_TIERS[tier].price[period].priceIds[env]}&usageLimit=${PRO_TIERS[tier].quota}`,
                {
                  method: "POST",
                },
              )
                .then(async (res) => {
                  const data = await res.json();
                  const { id: sessionId } = data;
                  const stripe = await getStripe();
                  stripe.redirectToCheckout({ sessionId });
                })
                .catch((err) => {
                  alert(err);
                  setClicked(false);
                });
            }}
            className={`${
              clicked
                ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                : "border-blue-500 bg-blue-500 text-white hover:bg-white hover:text-blue-500"
            } mb-2 flex h-10 w-full items-center justify-center rounded-md border text-sm transition-all focus:outline-none`}
          >
            {clicked ? (
              <LoadingDots color="#808080" />
            ) : (
              <p>Upgrade to {PRO_TIERS[tier].name}</p>
            )}
          </button>
          <a
            href="mailto:steven@dub.sh?subject=Upgrade%20to%20Enterprise%20Plan"
            className="text-sm text-gray-500 transition-all hover:text-gray-700"
          >
            Or contact us for Enterprise
          </a>
        </div>
      </div>
    </Modal>
  );
}

export function useUpgradePlanModal() {
  const [showUpgradePlanModal, setShowUpgradePlanModal] = useState(false);

  const UpgradePlanModalCallback = useCallback(() => {
    return (
      <UpgradePlanModal
        showUpgradePlanModal={showUpgradePlanModal}
        setShowUpgradePlanModal={setShowUpgradePlanModal}
      />
    );
  }, [showUpgradePlanModal, setShowUpgradePlanModal]);

  return useMemo(
    () => ({
      setShowUpgradePlanModal,
      UpgradePlanModal: UpgradePlanModalCallback,
    }),
    [setShowUpgradePlanModal, UpgradePlanModalCallback],
  );
}
