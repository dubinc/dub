"use client";

import { X } from "@/ui/shared/icons";
import {
  AnimatedSizeContainer,
  BlurImage,
  BookOpen,
  CircleDollar,
  CirclePlay,
  Modal,
} from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import {
  createContext,
  CSSProperties,
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useState,
} from "react";
import { AuthJs } from "./icons/auth-js";
import { Auth0 } from "./icons/auth0";
import { Clerk } from "./icons/clerk";
import { Custom } from "./icons/custom";
import { Shopify } from "./icons/shopify";
import { Stripe } from "./icons/stripe";
import { Supabase } from "./icons/supabase";

const GUIDE_THUMBNAIL = (title: string, description: string) => {
  return `https://mintlify.com/docs/api/og?division=Documentation&title=${title}&description=${description}&logoLight=https%3A%2F%2Fmintlify.s3.us-west-1.amazonaws.com%2Fdub%2Flogos%2Fwordmark.svg&logoDark=https%3A%2F%2Fmintlify.s3.us-west-1.amazonaws.com%2Fdub%2Flogos%2Fwordmark-dark.svg&primaryColor=%23eb5611&lightColor=%23eb5611&darkColor=%23eb5611`;
};

const PAYMENT_PROCESSORS = [
  {
    name: "Stripe",
    icon: Stripe,
    guide: "https://dub.co/docs/conversions/sales/stripe",
    thumbnail: GUIDE_THUMBNAIL(
      "Stripe",
      "Learn how to set up Stripe conversion tracking",
    ),
  },
  {
    name: "Shopify",
    icon: Shopify,
    guide: "https://dub.co/docs/conversions/sales/shopify",
    thumbnail: GUIDE_THUMBNAIL(
      "Shopify",
      "Learn how to set up Shopify conversion tracking",
    ),
    video: "https://www.loom.com/share/936970b8db5b41488657fa92ffec384a", // TODO: [Conversions] update video URL
    videoThumbnail:
      "https://cdn.loom.com/sessions/thumbnails/936970b8db5b41488657fa92ffec384a-0198848bd96f7918.jpg", // TODO: [Conversions] update video thumbnail
  },
  {
    name: "Custom Payments",
    shortName: "Custom",
    icon: Custom,
    guide: "https://dub.co/docs/conversions/quickstart", // TODO: [Conversions] update guide URL
    thumbnail: GUIDE_THUMBNAIL(
      "Custom Payments",
      "Learn how to set up custom payment conversion tracking",
    ),
  },
];

const AUTH_PROVIDERS = [
  {
    name: "Auth.js",
    icon: AuthJs,
    guide: "https://dub.co/docs/conversions/leads/next-auth",
    thumbnail: GUIDE_THUMBNAIL(
      "Auth.js",
      "Learn how to set up Auth.js conversion tracking",
    ),
  },
  {
    name: "Clerk",
    icon: Clerk,
    guide: "https://dub.co/docs/conversions/leads/clerk",
    thumbnail: GUIDE_THUMBNAIL(
      "Clerk",
      "Learn how to set up Clerk conversion tracking",
    ),
  },
  {
    name: "Supabase",
    icon: Supabase,
    guide: "https://dub.co/docs/conversions/leads/supabase-auth",
    thumbnail: GUIDE_THUMBNAIL(
      "Supabase",
      "Learn how to set up Supabase conversion tracking",
    ),
  },
  {
    name: "Auth0",
    icon: Auth0,
    guide: "https://dub.co/docs/conversions/leads/auth0",
    thumbnail: GUIDE_THUMBNAIL(
      "Auth0",
      "Learn how to set up Auth0 conversion tracking",
    ),
  },
  {
    name: "Custom Auth",
    shortName: "Custom",
    icon: Custom,
    guide: "https://dub.co/docs/conversions/quickstart", // TODO: [Conversions] update guide URL
    thumbnail: GUIDE_THUMBNAIL(
      "Custom Auth",
      "Learn how to set up custom auth conversion tracking",
    ),
  },
  {
    name: "Shopify",
    icon: Shopify,
    hidden: true,
    guide: "https://dub.co/docs/conversions/sales/shopify",
    thumbnail: GUIDE_THUMBNAIL(
      "Shopify",
      "Learn how to set up Shopify conversion tracking",
    ),
  },
];

const ConversionOnboardingModalContext = createContext<{
  paymentProcessorIndex: number | null;
  setPaymentProcessorIndex: Dispatch<SetStateAction<number | null>>;
  authProviderIndex: number | null;
  setAuthProviderIndex: Dispatch<SetStateAction<number | null>>;
}>({
  paymentProcessorIndex: null,
  setPaymentProcessorIndex: () => {},
  authProviderIndex: null,
  setAuthProviderIndex: () => {},
});

function ConversionOnboardingModal({
  showConversionOnboardingModal,
  setShowConversionOnboardingModal,
}: {
  showConversionOnboardingModal: boolean;
  setShowConversionOnboardingModal: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <Modal
      showModal={showConversionOnboardingModal}
      setShowModal={setShowConversionOnboardingModal}
      className="max-h-[calc(100dvh-100px)] max-w-xl"
    >
      <ConversionOnboardingModalInner
        setShowConversionOnboardingModal={setShowConversionOnboardingModal}
      />
    </Modal>
  );
}

function ConversionOnboardingModalInner({
  setShowConversionOnboardingModal,
}: {
  setShowConversionOnboardingModal: Dispatch<SetStateAction<boolean>>;
}) {
  const [paymentProcessorIndex, setPaymentProcessorIndex] = useState<
    number | null
  >(null);

  const [authProviderIndex, setAuthProviderIndex] = useState<number | null>(
    null,
  );

  return (
    <AnimatedSizeContainer
      height
      transition={{ duration: 0.1, ease: "easeInOut" }}
    >
      <div className="p-4 sm:p-8">
        <button
          type="button"
          onClick={() => setShowConversionOnboardingModal(false)}
          className="group absolute right-4 top-4 z-[1] hidden rounded-full p-2 text-gray-500 transition-all duration-75 hover:bg-gray-100 focus:outline-none active:bg-gray-200 md:block"
        >
          <X className="size-5" />
        </button>
        <ConversionOnboardingModalContext.Provider
          value={{
            paymentProcessorIndex,
            setPaymentProcessorIndex,
            authProviderIndex,
            setAuthProviderIndex,
          }}
        >
          <ModalPage visible={paymentProcessorIndex === null}>
            <PaymentProcessorSelection />
          </ModalPage>
          <ModalPage
            visible={
              paymentProcessorIndex !== null && authProviderIndex === null
            }
          >
            <AuthProviderSelection />
          </ModalPage>
          <ModalPage
            visible={
              paymentProcessorIndex !== null && authProviderIndex !== null
            }
          >
            <Docs />
          </ModalPage>
        </ConversionOnboardingModalContext.Provider>
      </div>
    </AnimatedSizeContainer>
  );
}

function ModalPage({
  children,
  visible,
}: {
  children: ReactNode;
  visible: boolean;
}) {
  return visible ? <div className="animate-fade-in">{children}</div> : null;
}

function PaymentProcessorSelection() {
  const { setPaymentProcessorIndex, setAuthProviderIndex } = useContext(
    ConversionOnboardingModalContext,
  );

  return (
    <div>
      <div className="flex size-12 items-center justify-center rounded-full border border-neutral-200 text-neutral-900">
        <CircleDollar className="size-8 [&_*]:stroke-1 [&_circle]:hidden" />
      </div>
      <h3 className="mt-6 text-lg font-semibold text-neutral-800">
        Set up conversion tracking
      </h3>
      <p className="mt-2 text-base text-neutral-500">
        Select your payment processor to view our setup guides.
      </p>
      <div
        className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-[repeat(var(--cols),minmax(0,1fr))]"
        style={
          {
            "--cols": PAYMENT_PROCESSORS.length,
          } as CSSProperties
        }
      >
        {PAYMENT_PROCESSORS.map(({ icon: Icon, name, shortName }, index) => (
          <button
            key={index}
            type="button"
            className="group flex flex-col items-center rounded-lg bg-neutral-200/40 p-8 pb-6 transition-colors duration-100 hover:bg-neutral-200/60"
            onClick={() => {
              setPaymentProcessorIndex(index);
              if (name === "Shopify") {
                setAuthProviderIndex(
                  AUTH_PROVIDERS.findIndex(({ name }) => name === "Shopify"),
                );
              }
            }}
          >
            <Icon className="h-11 transition-transform duration-100 group-hover:-translate-y-0.5" />
            <span className="mt-3 text-center text-sm font-medium text-neutral-700 sm:mt-8">
              {shortName || name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function AuthProviderSelection() {
  const authProviders = AUTH_PROVIDERS.filter(({ hidden }) => !hidden);

  const {
    paymentProcessorIndex,
    setPaymentProcessorIndex,
    setAuthProviderIndex,
  } = useContext(ConversionOnboardingModalContext);

  const paymentProcessor = PAYMENT_PROCESSORS[paymentProcessorIndex ?? 0];

  return (
    <div>
      <div className="flex size-12 items-center justify-center rounded-lg border border-neutral-200 text-neutral-900">
        <paymentProcessor.icon className="size-8" />
      </div>
      <h3 className="mt-6 text-lg font-semibold text-neutral-800">
        {paymentProcessor.name}
      </h3>

      <p className="mt-5 text-sm leading-none text-neutral-500">
        Select your auth provider
      </p>
      <div
        className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-[repeat(var(--cols),minmax(0,1fr))] sm:gap-2"
        style={
          {
            "--cols": authProviders.length,
          } as CSSProperties
        }
      >
        {authProviders.map(({ icon: Icon, name, shortName }, index) => (
          <button
            key={index}
            type="button"
            className="group flex flex-col items-center rounded-lg bg-neutral-200/40 p-8 pb-6 transition-colors duration-100 hover:bg-neutral-200/60"
            onClick={() => setAuthProviderIndex(index)}
          >
            <Icon className="h-11 transition-transform duration-100 group-hover:-translate-y-0.5" />
            <span className="mt-4 text-center text-sm font-medium text-neutral-700">
              {shortName || name}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-6 flex justify-center">
        <button
          type="button"
          className="text-sm leading-none text-neutral-500 underline transition-colors duration-75 hover:text-neutral-700"
          onClick={() => setPaymentProcessorIndex(null)}
        >
          Back to payment processors
        </button>
      </div>
    </div>
  );
}

function Docs() {
  const {
    paymentProcessorIndex,
    authProviderIndex,
    setPaymentProcessorIndex,
    setAuthProviderIndex,
  } = useContext(ConversionOnboardingModalContext);

  const paymentProcessor = PAYMENT_PROCESSORS[paymentProcessorIndex ?? 0];
  const authProvider = AUTH_PROVIDERS[authProviderIndex ?? 0];

  const isSameProvider = authProvider.name === paymentProcessor.name;

  return (
    <div>
      <div className="flex grid-cols-2 gap-12 sm:grid sm:gap-4">
        <div>
          <div className="flex size-12 items-center justify-center rounded-lg border border-neutral-200 text-neutral-900">
            <paymentProcessor.icon className="size-8" />
          </div>
          <h3 className="mt-6 text-lg font-semibold text-neutral-800">
            {paymentProcessor.name}
          </h3>
        </div>
        {!isSameProvider && (
          <div>
            <div className="flex size-12 items-center justify-center rounded-lg border border-neutral-200 text-neutral-900">
              <authProvider.icon className="size-8" />
            </div>
            <h3 className="mt-6 text-lg font-semibold text-neutral-800">
              {authProvider.name}
            </h3>
          </div>
        )}
      </div>
      <div
        className={cn(
          "mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2",
          isSameProvider &&
            !paymentProcessor.video &&
            "mx-auto max-w-xs sm:grid-cols-1",
        )}
      >
        {[
          // If it's the same provider but there's also a video, show that too
          ...(isSameProvider && paymentProcessor.video
            ? [
                {
                  label: "Watch app demo",
                  url: paymentProcessor.video,
                  thumbnail: paymentProcessor.videoThumbnail,
                  icon: CirclePlay,
                },
              ]
            : []),
          {
            label: `Read ${paymentProcessor.name} guide`,
            url: paymentProcessor.guide,
            thumbnail: paymentProcessor.thumbnail,
            icon: BookOpen,
          },
          // If it's the same provider don't show the auth provider guide
          ...(!isSameProvider
            ? [
                {
                  label: `Read ${authProvider.name} guide`,
                  url: authProvider.guide,
                  thumbnail: authProvider.thumbnail,
                  icon: BookOpen,
                },
              ]
            : []),
        ].map(({ icon: Icon, label, url, thumbnail }) => (
          <Link
            key={label}
            href={url || "https://dub.co/docs/conversions/quickstart"}
            target="_blank"
            className="group flex flex-col items-center rounded-lg bg-neutral-200/40 pb-4 pt-6 transition-colors duration-100 hover:bg-neutral-200/60"
          >
            <div className="flex w-full justify-center px-6">
              {thumbnail ? (
                <BlurImage
                  src={thumbnail}
                  alt={`${label} thumbnail`}
                  className="aspect-[1200/630] w-full max-w-[240px] rounded-lg bg-neutral-800 object-cover"
                  width={1200}
                  height={630}
                />
              ) : (
                <div className="aspect-video w-full rounded bg-neutral-300 shadow-sm" />
              )}
            </div>
            <span className="mt-4 flex items-center gap-2 px-2 text-left text-[0.8125rem] font-medium text-neutral-700">
              <Icon className="size-4" />
              {label}
            </span>
          </Link>
        ))}
      </div>
      <div className="mt-6 flex justify-center">
        <button
          type="button"
          className="text-sm leading-none text-neutral-500 underline transition-colors duration-75 hover:text-neutral-700"
          onClick={() => {
            setAuthProviderIndex(null);
            if (paymentProcessor.name === "Shopify")
              setPaymentProcessorIndex(null);
          }}
        >
          Back to{" "}
          {paymentProcessor.name === "Shopify"
            ? "payment processors"
            : "auth providers"}
        </button>
      </div>
    </div>
  );
}

export function useConversionOnboardingModal() {
  const [showConversionOnboardingModal, setShowConversionOnboardingModal] =
    useState(false);

  return {
    setShowConversionOnboardingModal,
    conversionOnboardingModal: (
      <ConversionOnboardingModal
        showConversionOnboardingModal={showConversionOnboardingModal}
        setShowConversionOnboardingModal={setShowConversionOnboardingModal}
      />
    ),
  };
}
