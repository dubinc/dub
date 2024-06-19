import { scopeDescriptions as allScopes } from "@/lib/api/tokens/scopes";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  BlurImage,
  Button,
  ButtonProps,
  Logo,
  Modal,
  RadioGroup,
  RadioGroupItem,
  useRouterStuff,
} from "@dub/ui";
import { useParams, useRouter } from "next/navigation";
import {
  Dispatch,
  FormEvent,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";

// TODO:
// Fetch the scopes from the API

type APIKeyProps = {
  id?: string;
  name: string;
  scopes: string[];
  isMachine: boolean;
};

function AddEditTokenModal({
  showAddEditTokenModal,
  setShowAddEditTokenModal,
  props,
}: {
  showAddEditTokenModal: boolean;
  setShowAddEditTokenModal: Dispatch<SetStateAction<boolean>>;
  props?: APIKeyProps;
}) {
  const router = useRouter();
  const { slug } = useParams() as { slug: string };
  const { id, logo, plan } = useWorkspace();
  const { queryParams } = useRouterStuff();

  const [saving, setSaving] = useState(false);
  const [lockDomain, setLockDomain] = useState(true);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState<APIKeyProps>(
    props || {
      id: "",
      name: "",
      scopes: [],
      isMachine: false,
    },
  );

  const saveDisabled = useMemo(() => {
    /* 
      Disable save if:
      - modal is not open
      - saving is in progress
      - domain is invalid
      - for an existing domain, there's no changes
    */
    if (
      !showAddEditTokenModal ||
      saving ||
      domainError ||
      (props &&
        Object.entries(props).every(([key, value]) => data[key] === value))
    ) {
      return true;
    } else {
      return false;
    }
  }, [showAddEditTokenModal, saving, domainError, props, data]);

  const endpoint = useMemo(() => {
    if (props) {
      return {
        method: "PATCH",
        url: `/api/domains/${"domain"}?workspaceId=${id}`,
        successMessage: "Successfully updated domain!",
      };
    } else {
      return {
        method: "POST",
        url: `/api/domains?workspaceId=${id}`,
        successMessage: "Successfully added domain!",
      };
    }
  }, [props]);

  const { name, scopes, isMachine } = data;

  // Save the form data
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
  };

  return (
    <Modal
      showModal={showAddEditTokenModal}
      setShowModal={setShowAddEditTokenModal}
      className="scrollbar-hide h-fit max-h-[95vh] overflow-auto"
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 sm:px-16">
        {logo ? (
          <BlurImage
            src={logo}
            alt={`Logo for ${slug}`}
            className="h-10 w-10 rounded-full border border-gray-200"
            width={20}
            height={20}
          />
        ) : (
          <Logo />
        )}
        <h1 className="text-lg font-medium">
          {props ? "Edit" : "Add"} API Key
        </h1>
      </div>

      <form
        onSubmit={onSubmit}
        className="flex flex-col space-y-6 bg-gray-50 px-4 py-8 text-left sm:px-10"
      >
        <div>
          <label htmlFor="name" className="flex items-center space-x-2">
            <h2 className="text-sm font-medium text-gray-900">Name</h2>
          </label>
          <div className="relative mt-2 rounded-md shadow-sm">
            <input
              name="target"
              id="target"
              className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
              placeholder="My Test Key"
              value={name}
              onChange={(e) => setData({ ...data, name: e.target.value })}
            />
          </div>
        </div>

        <div className="flex flex-col gap-8 text-sm text-gray-900">
          {allScopes.map((scope) => (
            <div
              className="flex items-center justify-between"
              key={`${scope.resource}-resource`}
            >
              <div>{scope.resource}</div>
              <div>
                <RadioGroup defaultValue="none" className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="none" id={scope.resource} />
                    <div>None</div>
                  </div>
                  {scope.permissions.map((permission) => (
                    <div
                      className="flex items-center space-x-2"
                      key={permission.scope}
                    >
                      <RadioGroupItem
                        value={permission.scope}
                        id={permission.scope}
                      />
                      <div>{permission.permission}</div>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>
          ))}
        </div>

        <Button
          text={props ? "Save changes" : "Create API key"}
          disabled={saveDisabled}
          loading={saving}
        />
      </form>
    </Modal>
  );
}

function AddTokenButton({
  setShowAddEditTokenModal,
  buttonProps,
}: {
  setShowAddEditTokenModal: Dispatch<SetStateAction<boolean>>;
  buttonProps?: Partial<ButtonProps>;
}) {
  return (
    <div>
      <Button
        text="New API Key"
        onClick={() => setShowAddEditTokenModal(true)}
        className="w-36"
        {...buttonProps}
      />
    </div>
  );
}

export function useAddEditTokenModal({ props }: { props?: APIKeyProps } = {}) {
  const [showAddEditTokenModal, setShowAddEditTokenModal] = useState(false);

  const AddEditTokenModalCallback = useCallback(() => {
    return (
      <AddEditTokenModal
        showAddEditTokenModal={showAddEditTokenModal}
        setShowAddEditTokenModal={setShowAddEditTokenModal}
        props={props}
      />
    );
  }, [showAddEditTokenModal, setShowAddEditTokenModal]);

  const AddTokenButtonCallback = useCallback(() => {
    return (
      <AddTokenButton setShowAddEditTokenModal={setShowAddEditTokenModal} />
    );
  }, [setShowAddEditTokenModal]);

  return useMemo(
    () => ({
      setShowAddEditTokenModal,
      AddEditTokenModal: AddEditTokenModalCallback,
      AddTokenButton: AddTokenButtonCallback,
    }),
    [
      setShowAddEditTokenModal,
      AddEditTokenModalCallback,
      AddTokenButtonCallback,
    ],
  );
}
