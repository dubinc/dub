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
      <div className="inline-block w-full sm:max-w-md overflow-hidden align-middle transition-all transform bg-white sm:border sm:border-gray-200 shadow-xl sm:rounded-2xl">
        <div className="flex flex-col justify-center items-center space-y-3 sm:px-16 px-4 pt-8 pb-24 border-b border-gray-200">
          <BlurImage
            src="/static/logo.png"
            alt="Dub logo"
            className="w-10 h-10 rounded-full border border-gray-200"
            width={20}
            height={20}
          />
          <h3 className="font-medium text-xl">Upgrade to Pro</h3>
          <div className="flex space-x-2 items-center">
            <p className="text-sm text-gray-600">Billed Monthly</p>
            <Switch setState={setAnnualBilling} />
            <p className="text-sm text-gray-600">Billed Annually</p>
          </div>
        </div>

        <div className="relative bg-white border border-gray-200 shadow-md rounded-lg max-w-sm mx-auto -mt-[5.1rem] -mb-[5.3rem]">
          {annualBilling && (
            <span className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-2 py-0.5 absolute top-2 -right-0.5 text-xs rounded-l-md">
              2 Free Months
            </span>
          )}
          <div className="max-w-md flex justify-between items-center w-full p-5 pt-7">
            <h3 className="text-2xl text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">
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
          <div className="w-full flex flex-col items-center space-y-1 bg-gray-50 text-center p-5 border-t border-gray-200 rounded-b-lg">
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

        <div className="flex flex-col items-center text-left bg-gray-50 sm:px-16 px-4 pt-28 pb-8">
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
                ? "cursor-not-allowed bg-gray-100 border-gray-200 text-gray-400"
                : "bg-blue-500 hover:bg-white hover:text-blue-500 border-blue-500 text-white"
            } flex justify-center items-center w-full text-sm h-10 mb-2 rounded-md border transition-all focus:outline-none`}
          >
            {clicked ? (
              <LoadingDots color="#808080" />
            ) : (
              <p>Upgrade to {PRO_TIERS[tier].name}</p>
            )}
          </button>
          <a
            href="mailto:steven@dub.sh?subject=Upgrade%20to%20Enterprise%20Plan"
            className="text-gray-500 text-sm hover:text-gray-700 transition-all"
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
