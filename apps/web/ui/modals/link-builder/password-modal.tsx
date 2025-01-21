import { ProBadgeTooltip } from "@/ui/shared/pro-badge-tooltip";
import {
  Button,
  ButtonTooltip,
  Modal,
  SimpleTooltipContent,
  Tooltip,
  useKeyboardShortcut,
  useMediaQuery,
} from "@dub/ui";
import { Eye, EyeSlash, InputPassword, Shuffle } from "@dub/ui/icons";
import { cn, nanoid } from "@dub/utils";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useForm, useFormContext } from "react-hook-form";
import { LinkFormData } from ".";

function PasswordModal({
  showPasswordModal,
  setShowPasswordModal,
}: {
  showPasswordModal: boolean;
  setShowPasswordModal: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <Modal
      showModal={showPasswordModal}
      setShowModal={setShowPasswordModal}
      className="sm:max-w-md"
    >
      <PasswordModalInner setShowPasswordModal={setShowPasswordModal} />
    </Modal>
  );
}

function PasswordModalInner({
  setShowPasswordModal,
}: {
  setShowPasswordModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { isMobile } = useMediaQuery();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const {
    watch: watchParent,
    getValues: getValuesParent,
    setValue: setValueParent,
  } = useFormContext<LinkFormData>();

  const {
    register,
    setValue,
    reset,
    formState: { isDirty, errors },
    handleSubmit,
  } = useForm<Pick<LinkFormData, "password">>({
    values: {
      password: getValuesParent("password"),
    },
  });

  const passwordParent = watchParent("password");

  const [showPassword, setShowPassword] = useState(false);

  // Hacky fix to focus the input automatically, not sure why autoFocus doesn't work here
  useEffect(() => {
    if (inputRef.current && !isMobile) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
    }
  }, []);

  const { ref, ...rest } = register("password");

  return (
    <form
      className="px-5 py-4"
      onSubmit={(e) => {
        e.stopPropagation();
        handleSubmit((data) => {
          setValueParent("password", data.password, { shouldDirty: true });
          setShowPasswordModal(false);
        })(e);
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium">Link Password</h3>
          <ProBadgeTooltip
            content={
              <SimpleTooltipContent
                title="Restrict access to your short links by encrypting it with a password."
                cta="Learn more."
                href="https://dub.co/help/article/password-protected-links"
              />
            }
          />
        </div>
        <div className="max-md:hidden">
          <Tooltip
            content={
              <div className="px-2 py-1 text-xs text-gray-700">
                Press <strong className="font-medium text-gray-950">P</strong>{" "}
                to open this quickly
              </div>
            }
            side="right"
          >
            <kbd className="flex size-6 cursor-default items-center justify-center rounded-md border border-gray-200 font-sans text-xs text-gray-950">
              P
            </kbd>
          </Tooltip>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <span className="block text-sm font-medium text-gray-700">
            Password
          </span>
          <div className="flex items-center gap-2">
            <ButtonTooltip
              className="text-gray-500 transition-colors hover:text-gray-800"
              tooltipProps={{
                content: showPassword ? "Hide password" : "Reveal password",
              }}
              onClick={() => setShowPassword((s) => !s)}
            >
              {showPassword ? (
                <EyeSlash className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </ButtonTooltip>
            <ButtonTooltip
              tooltipProps={{
                content: "Generate a random password",
              }}
              onClick={() => {
                setValue("password", nanoid(24), { shouldDirty: true });
              }}
            >
              <Shuffle className="size-4" />
            </ButtonTooltip>
          </div>
        </div>
        <div className="mt-2 rounded-md shadow-sm">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Create password"
            data-1p-ignore
            className={`${
              errors.password
                ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:ring-gray-500"
            } block w-full rounded-md focus:outline-none sm:text-sm`}
            {...rest}
            ref={(e) => {
              ref(e);
              inputRef.current = e;
            }}
          />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div>
          {Boolean(passwordParent) && (
            <button
              type="button"
              className="text-xs font-medium text-gray-700 transition-colors hover:text-gray-950"
              onClick={() => {
                setValueParent("password", null, { shouldDirty: true });
                ["title", "description", "image"].forEach(
                  (key: "title" | "description" | "image") =>
                    setValueParent(key, null, { shouldDirty: true }),
                );
                setShowPasswordModal(false);
              }}
            >
              Remove password
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            text="Cancel"
            className="h-9 w-fit"
            onClick={() => {
              reset();
              setShowPasswordModal(false);
            }}
          />
          <Button
            type="submit"
            variant="primary"
            text={passwordParent ? "Save" : "Add password"}
            className="h-9 w-fit"
            disabled={!isDirty}
          />
        </div>
      </div>
    </form>
  );
}

export function getPasswordLabel({ password }: Pick<LinkFormData, "password">) {
  return password ? "Protected" : "Password";
}

function PasswordButton({
  setShowPasswordModal,
}: {
  setShowPasswordModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { watch } = useFormContext<LinkFormData>();
  const password = watch("password");

  useKeyboardShortcut("p", () => setShowPasswordModal(true), {
    modal: true,
  });

  return (
    <Button
      variant="secondary"
      text={getPasswordLabel({ password })}
      icon={
        <InputPassword className={cn("size-4", password && "text-blue-500")} />
      }
      className="h-9 w-fit px-2.5 font-medium text-gray-700"
      onClick={() => setShowPasswordModal(true)}
    />
  );
}

export function usePasswordModal() {
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const PasswordModalCallback = useCallback(() => {
    return (
      <PasswordModal
        showPasswordModal={showPasswordModal}
        setShowPasswordModal={setShowPasswordModal}
      />
    );
  }, [showPasswordModal, setShowPasswordModal]);

  const PasswordButtonCallback = useCallback(() => {
    return <PasswordButton setShowPasswordModal={setShowPasswordModal} />;
  }, [setShowPasswordModal]);

  return useMemo(
    () => ({
      setShowPasswordModal,
      PasswordModal: PasswordModalCallback,
      PasswordButton: PasswordButtonCallback,
    }),
    [setShowPasswordModal, PasswordModalCallback, PasswordButtonCallback],
  );
}
