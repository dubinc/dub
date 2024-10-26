import { ResourceKey, RESOURCES } from "@/lib/api/rbac/resources";
import {
  getScopesByResourceForRole,
  Scope,
  scopePresets,
} from "@/lib/api/tokens/scopes";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  AnimatedSizeContainer,
  BlurImage,
  Button,
  ButtonProps,
  InfoTooltip,
  Label,
  Logo,
  Modal,
  RadioGroup,
  RadioGroupItem,
} from "@dub/ui";
import { ToggleGroup } from "@dub/ui/src/toggle-group";
import { SimpleTooltipContent } from "@dub/ui/src/tooltip";
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
}: {
  showAddEditTokenModal: boolean;
  setShowAddEditTokenModal: Dispatch<SetStateAction<boolean>>;
  token?: APIKeyProps;
  onTokenCreated?: (token: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const {
    id: workspaceId,
    logo,
    slug,
    role,
    isOwner,
    conversionEnabled,
  } = useWorkspace();
  const [data, setData] = useState<APIKeyProps>(token || newToken);
  const [preset, setPreset] = useState<ScopePreset>("all_access");

  useEffect(() => {
    if (!token) return;

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
      onTokenCreated?.(result.token);
      setShowAddEditTokenModal(false);
    } else {
      toast.error(result.error.message);
    }
  };

  const { name, scopes } = data;
  const buttonDisabled =
    (!name || token?.name === name) && token?.scopes === scopes;

  const scopesByResources = useMemo(
    () =>
      transformScopesForUI(getScopesByResourceForRole(role)).filter(
        ({ key }) => key !== "conversions" || conversionEnabled,
      ),
    [role, conversionEnabled],
  );

  return (
    <>
      <Modal
        showModal={showAddEditTokenModal}
        setShowModal={setShowAddEditTokenModal}
        className="max-h-[95dvh]"
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
            {token ? "Edit" : "Add New"} API Key
          </h1>
        </div>

        <form
          onSubmit={onSubmit}
          className="flex flex-col space-y-4 bg-gray-50 px-4 py-8 text-left sm:px-10"
        >
          {/* Can't change the type of the token */}
          {!token && (
            <div>
              <RadioGroup
                className="flex"
                defaultValue="user"
                required
                onValueChange={(value) =>
                  setData({ ...data, isMachine: value === "machine" })
                }
              >
                <div className="flex w-1/2 items-center space-x-2 rounded-md border border-gray-300 bg-white transition-all hover:bg-gray-50 active:bg-gray-100">
                  <RadioGroupItem value="user" id="user" className="ml-3" />
                  <Label
                    htmlFor="user"
                    className="flex flex-1 cursor-pointer items-center justify-between space-x-1 p-3 pl-0"
                  >
                    <p className="text-gray-600">You</p>
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
                    "flex w-1/2 items-center space-x-2 rounded-md border border-gray-300 bg-white transition-all hover:bg-gray-50 active:bg-gray-100",
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
                    <p className="text-gray-600">Machine</p>
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

          <div>
            <label htmlFor="name" className="flex items-center space-x-2">
              <h2 className="text-sm font-medium text-gray-900">Name</h2>
            </label>
            <div className="relative mt-2 rounded-md shadow-sm">
              <input
                className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
                required
                value={name}
                onChange={(e) => setData({ ...data, name: e.target.value })}
                autoFocus
                autoComplete="off"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-gray-900">Permissions</h2>
            <div className="flex">
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
              />
            </div>
          </div>

          <AnimatedSizeContainer height>
            <div className="p-1 pt-0 text-sm text-gray-500">
              This API key will have{" "}
              {scopePresets.find((p) => p.value === preset)?.description}
            </div>
            {preset === "restricted" && (
              <div className="flex flex-col divide-y text-sm">
                {scopesByResources.map((resource) => (
                  <div
                    className="flex items-center justify-between py-4"
                    key={resource.key}
                  >
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <p>{resource.name}</p>
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
                            <div className="capitalize">{scope.type}</div>
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
  return (
    <div>
      <Button
        text="Create"
        onClick={() => setShowAddEditTokenModal(true)}
        {...buttonProps}
      />
    </div>
  );
}

export function useAddEditTokenModal(
  {
    token,
    onTokenCreated,
  }: {
    token?: APIKeyProps;
    onTokenCreated?: (token: string) => void;
  } = { onTokenCreated: () => {} },
) {
  const [showAddEditTokenModal, setShowAddEditTokenModal] = useState(false);

  const AddEditTokenModalCallback = useCallback(() => {
    return (
      <AddEditTokenModal
        showAddEditTokenModal={showAddEditTokenModal}
        setShowAddEditTokenModal={setShowAddEditTokenModal}
        token={token}
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

const transformScopesForUI = (scopedResources) => {
  return Object.keys(scopedResources).map((resourceKey: ResourceKey) => {
    return {
      ...RESOURCES.find((r) => r.key === resourceKey)!,
      scopes: scopedResources[resourceKey],
    };
  });
};
