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
} from "@dub/ui";
import {
  Dispatch,
  FormEvent,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { mutate } from "swr";

// TODO:
// Fetch the scopes from the API

type APIKeyProps = {
  id?: string;
  name: string;
  scopes: { [key: string]: string };
  isMachine: boolean;
};

const newToken: APIKeyProps = {
  name: "",
  scopes: {},
  isMachine: false,
};

function AddEditTokenModal({
  showAddEditTokenModal,
  setShowAddEditTokenModal,
  props,
  onTokenCreated,
}: {
  showAddEditTokenModal: boolean;
  setShowAddEditTokenModal: Dispatch<SetStateAction<boolean>>;
  props?: APIKeyProps;
  onTokenCreated: (token: string) => void;
}) {
  const { id: workspaceId, logo, slug } = useWorkspace();

  const [saving, setSaving] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [data, setData] = useState<APIKeyProps>(props || newToken);

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

  // Determine the endpoint
  const endpoint = useMemo(() => {
    if (props) {
      return {
        method: "PATCH",
        url: `/api/tokens/${"id"}?workspaceId=${workspaceId}`,
        successMessage: "API key updated!",
      };
    } else {
      return {
        method: "POST",
        url: `/api/tokens?workspaceId=${workspaceId}`,
        successMessage: "API key created!",
      };
    }
  }, [props]);

  // Save the form data
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const response = await fetch(endpoint.url, {
      method: endpoint.method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...data,
        scopes: Object.values(scopes).filter((v) => v),
      }),
    });

    const result = await response.json();

    if (response.ok) {
      mutate(`/api/tokens?workspaceId=${workspaceId}`);
      toast.success(endpoint.successMessage);
      onTokenCreated(result.token);
      setShowAddEditTokenModal(false);
    } else {
      toast.error(result.error.message);
    }
  };

  const { name, scopes, isMachine } = data;

  return (
    <>
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
            {props ? "Edit" : "Add New"} API Key
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
                required
                value={name}
                onChange={(e) => setData({ ...data, name: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col divide-y text-sm">
            {allScopes.map((scope) => (
              <div
                className="flex items-center justify-between py-4"
                key={`${scope.resource}-resource`}
              >
                <div className="text-gray-500">{scope.resource}</div>
                <div>
                  <RadioGroup
                    defaultValue=""
                    className="flex gap-4"
                    onValueChange={(v) => {
                      setData({
                        ...data,
                        scopes: {
                          ...scopes,
                          [scope.resource.toLocaleLowerCase()]: v,
                        },
                      });
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="" />
                      <div>None</div>
                    </div>
                    {scope.permissions.map((permission) => (
                      <div
                        className="flex items-center space-x-2"
                        key={permission.scope}
                      >
                        <RadioGroupItem value={permission.scope} />
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
    </>
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

export function useAddEditTokenModal(
  {
    props,
    onTokenCreated,
  }: {
    props?: APIKeyProps;
    onTokenCreated: (token: string) => void;
  } = { onTokenCreated: () => {} },
) {
  const [showAddEditTokenModal, setShowAddEditTokenModal] = useState(false);

  const AddEditTokenModalCallback = useCallback(() => {
    return (
      <AddEditTokenModal
        showAddEditTokenModal={showAddEditTokenModal}
        setShowAddEditTokenModal={setShowAddEditTokenModal}
        props={props}
        onTokenCreated={onTokenCreated}
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
