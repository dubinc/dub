import Modal from "@/components/shared/modal";
import {
  useCallback,
  useMemo,
  useState,
  Dispatch,
  SetStateAction,
} from "react";
import LoadingDots from "@/components/shared/icons/loading-dots";

function AddModalHelper({
  showAddModal,
  setShowAddModal,
}: {
  showAddModal: boolean;
  setShowAddModal: Dispatch<SetStateAction<boolean>>;
}) {
  const [signInClicked, setSignInClicked] = useState(false);
  const [buttonText, setButtonText] = useState("Sign in with magic link");

  return (
    <Modal showModal={showAddModal} setShowModal={setShowAddModal}>
      <div className="inline-block w-full max-w-md py-8 px-4 sm:px-16 overflow-hidden text-center align-middle transition-all transform bg-white shadow-xl rounded-2xl">
        <div>
          <h3 className="font-serif font-bold text-3xl mb-4 tracking-wide">
            Add a new link
          </h3>
          <p className="text-sm text-gray-500">
            Shorten a link and give it a custom URL.
          </p>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSignInClicked(true);
          }}
          className="mt-5 flex flex-col space-y-4"
        >
          <input
            name="email"
            type="email"
            placeholder="Email Address"
            autoComplete="email"
            required
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-black focus:border-black sm:text-sm"
          />
          <button
            disabled={signInClicked}
            className={`${
              signInClicked
                ? "cursor-not-allowed bg-gray-100 border-gray-200"
                : "bg-black hover:bg-white text-white hover:text-black border-black"
            } flex justify-center items-center w-full text-sm h-10 rounded-md border transition-all focus:outline-none`}
          >
            {signInClicked ? (
              <LoadingDots color="#808080" />
            ) : (
              <p>{buttonText}</p>
            )}
          </button>
        </form>
      </div>
    </Modal>
  );
}

export function useAddModal() {
  const [showAddModal, setShowAddModal] = useState(false);

  const AddModal = useCallback(() => {
    return (
      <AddModalHelper
        showAddModal={showAddModal}
        setShowAddModal={setShowAddModal}
      />
    );
  }, [showAddModal, setShowAddModal]);

  return useMemo(
    () => ({ setShowAddModal, AddModal }),
    [setShowAddModal, AddModal]
  );
}
