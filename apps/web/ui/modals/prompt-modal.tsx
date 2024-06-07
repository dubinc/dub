import { Button, ButtonProps, LinkLogo, Modal, useMediaQuery } from "@dub/ui";
import {
  Dispatch,
  HTMLProps,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";

type PromptModelProps = {
  title: string;
  label: string;
  description?: string;
  onSubmit?: (value: string) => Promise<void> | void;
  inputProps?: HTMLProps<HTMLInputElement>;
  buttonProps?: ButtonProps;
};

/**
 * A generic prompt modal for text input
 */
function PromptModal({
  showPromptModal,
  setShowPromptModal,
  title,
  label,
  description,
  onSubmit,
  inputProps,
  buttonProps,
}: {
  showPromptModal: boolean;
  setShowPromptModal: Dispatch<SetStateAction<boolean>>;
} & PromptModelProps) {
  const { isMobile } = useMediaQuery();

  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <Modal showModal={showPromptModal} setShowModal={setShowPromptModal}>
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 text-center sm:px-16">
        <LinkLogo />
        <h3 className="text-lg font-medium">{title}</h3>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          e.stopPropagation();

          setLoading(true);
          await onSubmit?.(value);
          setLoading(false);
          setShowPromptModal(false);
        }}
        className="flex flex-col space-y-3 bg-gray-50 px-4 py-8 text-left sm:px-16"
      >
        <label className="block">
          <p className="text-sm text-gray-700">{label}</p>
          <div className="relative mt-1 rounded-md shadow-sm">
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
              autoFocus={!isMobile}
              autoComplete="off"
              className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
              {...inputProps}
            />
          </div>
        </label>

        <Button
          variant="primary"
          text="Submit"
          loading={loading}
          {...buttonProps}
        />
      </form>
    </Modal>
  );
}

export function usePromptModal(props: PromptModelProps) {
  const [showPromptModal, setShowPromptModal] = useState(false);

  const PromptModalCallback = useCallback(() => {
    return props ? (
      <PromptModal
        showPromptModal={showPromptModal}
        setShowPromptModal={setShowPromptModal}
        {...props}
      />
    ) : null;
  }, [showPromptModal, setShowPromptModal]);

  return useMemo(
    () => ({
      setShowPromptModal,
      PromptModal: PromptModalCallback,
    }),
    [setShowPromptModal, PromptModalCallback],
  );
}
