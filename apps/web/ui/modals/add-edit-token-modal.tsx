import { ResourceKey, RESOURCES } from "@/lib/api/rbac/resources";
import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import {
  getScopesByResourceForRole,
  Scope,
  scopePresets,
} from "@/lib/api/tokens/scopes";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  AnimatedSizeContainer,
  Button,
  ButtonProps,
  InfoTooltip,
  Label,
  Modal,
  RadioGroup,
  RadioGroupItem,
  SimpleTooltipContent,
  ToggleGroup,
} from "@dub/ui";
import { cn } from "@dub/utils";
import {
  Dispatch,
  FormEvent,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { mutate } from "swr";

type APIKeyProps = {
  id?: string;
  name: string;
  scopes: { [key: string]: Scope };
  isMachine: boolean;
};

type ScopePreset = "all_access" | "read_only" | "restricted";

const newToken: APIKeyProps = {
  name: "",
  scopes: { api: "apis.all" },
  isMachine: false,
};

function AddEditTokenModal({
  showAddEditTokenModal,
  setShowAddEditTokenModal,
  token,
  onTokenCreated,
  setSelectedToken,
}: {
  showAddEditTokenModal: boolean;
  setShowAddEditTokenModal: Dispatch<SetStateAction<boolean>>;
  token?: APIKeyProps;
  onTokenCreated?: (token: string) => void;
  setSelectedToken: Dispatch<SetStateAction<null>>;
}) {
  const [saving, setSaving] = useState(false);
  const { id: workspaceId, role, isOwner, flags } = useWorkspace();
  const [data, setData] = useState<APIKeyProps>(token || newToken);
  const [preset, setPreset] = useState<ScopePreset>("all_access");

  useEffect(() => {
    if (!token) {
      return;
    }

    const scopes = Object.values(token.scopes);

    if (scopes.includes("apis.all")) {
      setPreset("all_access");
    } else if (scopes.includes("apis.read")) {
      setPreset("read_only");
    } else {
      setPreset("restricted");
    }
  }, [token]);

  // Determine the endpoint
  const endpoint = useMemo(() => {
    if (token) {
      return {
        method: "PATCH",
        url: `/api/tokens/${token.id}?workspaceId=${workspaceId}`,
        successMessage: "API key updated!",
      };
    } else {
      return {
        method: "POST",
        url: `/api/tokens?workspaceId=${workspaceId}`,
        successMessage: "API key created!",
      };
    }
  }, [token]);

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
      setShowAddEditTokenModal(false);
      setSelectedToken(null);

      if (!token) {
        onTokenCreated?.(result.token);
      }
    } else {
      setSaving(false);
      toast.error(result.error.message);
    }
  };

  const { name, scopes } = data;
  const buttonDisabled =
    (!name || token?.name === name) && token?.scopes === scopes;

  const scopesByResources = useMemo(() => {
    let scopes = transformScopesForUI(getScopesByResourceForRole(role)).filter(
      ({ name }) => name,
    );

    if (!flags?.linkFolders) {
      scopes = scopes.filter(({ key }) => key !== "folders");
    }

    return scopes;
  }, [role, flags?.linkFolders]);

  return (
    <>
      <Modal
        showModal={showAddEditTokenModal}
        setShowModal={setShowAddEditTokenModal}
        className="max-w-lg"
        onClose={() => setSelectedToken(null)}
      >
        <h3 className="border-b border-neutral-200 px-4 py-4 text-lg font-medium sm:px-6">
          {token ? "Edit" : "Create New"} API Key
        </h3>

        <form
          onSubmit={onSubmit}
          className="flex flex-col space-y-4 bg-neutral-50 px-4 py-8 text-left sm:px-10"
        >
          <div>
            <label htmlFor="name">
              <h2 className="text-sm font-medium text-neutral-900">Name</h2>
            </label>
            <div className="relative mt-2 rounded-md shadow-sm">
              <input
                id="name"
                className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                required
                value={name}
                onChange={(e) => setData({ ...data, name: e.target.value })}
                autoFocus
                autoComplete="off"
              />
            </div>
          </div>

          {/* Can't change the type of the token */}
          {!token && (
            <div>
              <h2 className="text-sm font-medium text-neutral-900">Type</h2>
              <RadioGroup
                className="mt-2 flex"
                defaultValue="user"
                required
                onValueChange={(value) =>
                  setData({ ...data, isMachine: value === "machine" })
                }
              >
                <div className="flex w-1/2 items-center space-x-2 rounded-md border border-neutral-300 bg-white transition-all hover:bg-neutral-50 active:bg-neutral-100">
                  <RadioGroupItem value="user" id="user" className="ml-3" />
                  <Label
                    htmlFor="user"
                    className="flex flex-1 cursor-pointer items-center justify-between space-x-1 p-3 pl-0"
                  >
                    <p className="text-neutral-600">You</p>
                    <InfoTooltip
                      content={
                        <SimpleTooltipContent
                          title="This API key will be tied to your user account – if you are removed from the workspace, it will be deleted."
                          cta="Learn more"
                          href="https://dub.co/docs/api-reference/tokens"
                        />
                      }
                    />
                  </Label>
                </div>
                <div
                  className={cn(
                    "flex w-1/2 items-center space-x-2 rounded-md border border-neutral-300 bg-white transition-all hover:bg-neutral-50 active:bg-neutral-100",
                    {
                      "cursor-not-allowed opacity-75": !isOwner,
                    },
                  )}
                >
                  <RadioGroupItem
                    value="machine"
                    id="machine"
                    className="ml-3"
                    disabled={!isOwner}
                  />
                  <Label
                    htmlFor="machine"
                    className={cn(
                      "flex flex-1 cursor-pointer items-center justify-between space-x-1 p-3 pl-0",
                      {
                        "cursor-not-allowed": !isOwner,
                      },
                    )}
                  >
                    <p className="text-neutral-600">Machine</p>
                    <InfoTooltip
                      content={
                        <SimpleTooltipContent
                          title={
                            isOwner
                              ? "A new bot member will be added to your workspace, and the key will be associated with it. Since the key is not tied to your account, it will not be deleted even if you leave the workspace."
                              : "Only the workspace owner can create machine users."
                          }
                          cta="Learn more"
                          href="https://dub.co/docs/api-reference/tokens#machine-users"
                        />
                      }
                    />
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-neutral-900">
              Permissions
            </h2>

            <ToggleGroup
              options={scopePresets}
              selected={preset}
              selectAction={(value: ScopePreset) => {
                setPreset(value);

                if (value === "all_access") {
                  setData({ ...data, scopes: { api: "apis.all" } });
                } else if (value === "read_only") {
                  setData({ ...data, scopes: { api: "apis.read" } });
                } else {
                  setData({ ...data, scopes: {} });
                }
              }}
              className="grid grid-cols-3 rounded-md border border-neutral-300 bg-neutral-100"
              optionClassName="w-full h-8 flex items-center justify-center text-sm text-neutral-800"
              indicatorClassName="rounded-md bg-white border border-neutral-300 shadow-sm"
            />
          </div>

          <AnimatedSizeContainer height>
            <div className="p-1 pt-0 text-sm text-neutral-500">
              This API key will have{" "}
              <span className="font-medium text-neutral-700">
                {scopePresets.find((p) => p.value === preset)?.description}
              </span>
            </div>
            {preset === "restricted" && (
              <div className="flex flex-col divide-y text-sm">
                {scopesByResources.map((resource) => (
                  <div
                    className="flex items-center justify-between py-4"
                    key={resource.key}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-neutral-800">
                        {resource.name}
                      </span>
                      <InfoTooltip content={resource.description} />
                    </div>
                    <div>
                      <RadioGroup
                        defaultValue={scopes[resource.key] || ""}
                        className="flex gap-4"
                        onValueChange={(v: Scope) => {
                          setData({
                            ...data,
                            scopes: {
                              ...scopes,
                              [resource.key]: v,
                            },
                          });
                        }}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="" />
                          <div>None</div>
                        </div>
                        {resource.scopes.map((scope) => (
                          <div
                            className="flex items-center space-x-2"
                            key={scope.scope}
                          >
                            <RadioGroupItem value={scope.scope} />
                            <div className="text-sm font-normal capitalize text-neutral-800">
                              {scope.type}
                            </div>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AnimatedSizeContainer>

          <Button
            text={token ? "Save changes" : "Create API key"}
            disabled={buttonDisabled}
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
  const { role } = useWorkspace();

  return (
    <div>
      <Button
        text="Create API key"
        onClick={() => setShowAddEditTokenModal(true)}
        disabledTooltip={
          clientAccessCheck({
            action: "tokens.write",
            role,
            customPermissionDescription: "create new API keys",
          }).error || undefined
        }
        {...buttonProps}
      />
    </div>
  );
}

export function useAddEditTokenModal({
  token,
  onTokenCreated,
  setSelectedToken,
}: {
  token?: APIKeyProps;
  onTokenCreated?: (token: string) => void;
  setSelectedToken: Dispatch<SetStateAction<null>>;
}) {
  const [showAddEditTokenModal, setShowAddEditTokenModal] = useState(false);

  const AddEditTokenModalCallback = useCallback(() => {
    return (
      <AddEditTokenModal
        showAddEditTokenModal={showAddEditTokenModal}
        setShowAddEditTokenModal={setShowAddEditTokenModal}
        token={token}
        onTokenCreated={onTokenCreated}
        setSelectedToken={setSelectedToken}
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

const transformScopesForUI = (scopedResources) => {
  return Object.keys(scopedResources).map((resourceKey: ResourceKey) => {
    return {
      ...RESOURCES.find((r) => r.key === resourceKey)!,
      scopes: scopedResources[resourceKey],
    };
  });
};
