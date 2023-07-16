import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import Modal from "@/components/shared/modal";
import Button from "#/ui/button";
import { useRouter } from "next/router";
import Link from "next/link";
import { motion } from "framer-motion";
import { STAGGER_CHILD_VARIANTS } from "#/lib/constants";
import { CheckCircleFill } from "@/components/shared/icons";
import { capitalize } from "#/lib/utils";
import { PLANS } from "#/lib/stripe/utils";
import { getStripe } from "#/lib/stripe/client";

function UpgradePlanModal({
  showUpgradePlanModal,
  setShowUpgradePlanModal,
  welcomeFlow,
}: {
  showUpgradePlanModal: boolean;
  setShowUpgradePlanModal: Dispatch<SetStateAction<boolean>>;
  welcomeFlow?: boolean;
}) {
  const router = useRouter();
  const { slug } = router.query;
  const features = [
    "Unlimited custom domains",
    "Unlimited team members",
    "Unlimited link history",
    "Track 50x more link clicks per month",
    "Redirect your root domain",
    "Custom QR Code logo",
  ];
  const [period, setPeriod] = useState<"monthly" | "yearly">("yearly");
  const [clicked, setClicked] = useState(false);
  return (
    <Modal
      showModal={showUpgradePlanModal}
      setShowModal={setShowUpgradePlanModal}
      closeWithX={welcomeFlow}
    >
      <div className="inline-block w-full transform overflow-hidden bg-white align-middle shadow-xl transition-all sm:max-w-md sm:rounded-2xl sm:border sm:border-gray-200">
        <motion.div
          variants={{
            show: {
              transition: {
                staggerChildren: 0.15,
              },
            },
          }}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-8 sm:px-16"
        >
          <motion.img
            src="/_static/logo.png"
            alt="Dub logo"
            className="h-10 w-10 rounded-full border border-gray-200"
            width={20}
            height={20}
            variants={STAGGER_CHILD_VARIANTS}
          />
          <motion.h3
            className="text-lg font-medium"
            variants={STAGGER_CHILD_VARIANTS}
          >
            Upgrade to Pro
          </motion.h3>
          <motion.p
            className="text-center text-sm text-gray-500"
            variants={STAGGER_CHILD_VARIANTS}
          >
            Enjoy higher limits and more powerful features with our Pro plan.
          </motion.p>
        </motion.div>
        <div className="bg-gray-50 px-4 py-8 text-left sm:px-16">
          <motion.div
            className="flex flex-col space-y-3"
            variants={STAGGER_CHILD_VARIANTS}
            initial="hidden"
            animate="show"
          >
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium text-gray-900">
                    Pro {capitalize(period)}
                  </h4>
                  <span className="rounded-full border border-gray-400 px-2 py-px text-sm text-gray-500">
                    {period === "monthly" ? "$9/month" : "$90/year"}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setPeriod(period === "monthly" ? "yearly" : "monthly");
                  }}
                  className="text-xs text-gray-500 underline"
                >
                  Switch to {period === "monthly" ? "yearly" : "monthly"}
                </button>
              </div>
              <motion.div
                variants={{
                  show: {
                    transition: {
                      staggerChildren: 0.05,
                    },
                  },
                }}
                initial="hidden"
                animate="show"
                className="flex flex-col space-y-2"
              >
                {features.map((feature, i) => (
                  <motion.div
                    key={i}
                    variants={STAGGER_CHILD_VARIANTS}
                    className="flex items-center space-x-2 text-sm text-gray-500"
                  >
                    <CheckCircleFill className="h-5 w-5 text-green-500" />
                    <span>{feature}</span>
                  </motion.div>
                ))}
              </motion.div>
            </div>
            <Button
              text={`Upgrade to Pro ${capitalize(period)}`}
              loading={clicked}
              onClick={() => {
                setClicked(true);
                fetch(
                  `/api/projects/${slug}/billing/upgrade?priceId=${
                    PLANS.find((p) => p.slug === "pro")!.price[period].priceIds[
                      process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
                        ? "production"
                        : "test"
                    ]
                  }`,
                  {
                    method: "POST",
                  },
                )
                  .then(async (res) => {
                    const data = await res.json();
                    const { id: sessionId } = data;
                    const stripe = await getStripe();
                    stripe?.redirectToCheckout({ sessionId });
                  })
                  .catch((err) => {
                    alert(err);
                    setClicked(false);
                  });
              }}
            />
            {welcomeFlow && (
              <Link
                href={`/${slug}`}
                className="text-center text-xs text-gray-500 underline underline-offset-4 transition-colors hover:text-gray-800"
              >
                Skip for now
              </Link>
            )}
          </motion.div>
        </div>
      </div>
    </Modal>
  );
}

export function useUpgradePlanModal({
  welcomeFlow,
}: { welcomeFlow?: boolean } = {}) {
  const [showUpgradePlanModal, setShowUpgradePlanModal] = useState(false);

  const UpgradePlanModalCallback = useCallback(() => {
    return (
      <UpgradePlanModal
        showUpgradePlanModal={showUpgradePlanModal}
        setShowUpgradePlanModal={setShowUpgradePlanModal}
        welcomeFlow={welcomeFlow}
      />
    );
  }, [showUpgradePlanModal, setShowUpgradePlanModal, welcomeFlow]);

  return useMemo(
    () => ({
      setShowUpgradePlanModal,
      UpgradePlanModal: UpgradePlanModalCallback,
    }),
    [setShowUpgradePlanModal, UpgradePlanModalCallback],
  );
}
