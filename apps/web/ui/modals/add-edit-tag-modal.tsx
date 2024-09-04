import useTags from "@/lib/swr/use-tags";
import useWorkspace from "@/lib/swr/use-workspace";
import { TagColorProps, TagProps } from "@/lib/types";
import {
  Button,
  InfoTooltip,
  Label,
  Logo,
  Modal,
  RadioGroup,
  RadioGroupItem,
  TooltipContent,
  useMediaQuery,
} from "@dub/ui";
import { capitalize, cn } from "@dub/utils";
import posthog from "posthog-js";
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
import { COLORS_LIST, randomBadgeColor } from "../links/tag-badge";

function AddEditTagModal({
  showAddEditTagModal,
  setShowAddEditTagModal,
  props,
}: {
  showAddEditTagModal: boolean;
  setShowAddEditTagModal: Dispatch<SetStateAction<boolean>>;
  props?: TagProps;
}) {
  const { id: workspaceId } = useWorkspace();
  const { isMobile } = useMediaQuery();

  const [saving, setSaving] = useState(false);

  const [data, setData] = useState<TagProps>(
    props || {
      id: "",
      name: "",
      color: randomBadgeColor(),
    },
  );
  const { id, name, color } = data;

  const saveDisabled = useMemo(
    () =>
      saving ||
      !name ||
      !color ||
      (props &&
        Object.entries(props).every(([key, value]) => data[key] === value)),
    [props, data],
  );

  const endpoint = useMemo(
    () =>
      id
        ? {
            method: "PATCH",
            url: `/api/tags/${id}?workspaceId=${workspaceId}`,
            successMessage: "Successfully updated tag!",
          }
        : {
            method: "POST",
            url: `/api/tags?workspaceId=${workspaceId}`,
            successMessage: "Successfully added tag!",
          },
    [id],
  );

  return (
    <Modal
      showModal={showAddEditTagModal}
      setShowModal={setShowAddEditTagModal}
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 sm:px-16">
        <Logo />
        <div className="flex flex-col space-y-1 text-center">
          <h3 className="text-lg font-medium">{props ? "Edit" : "Add"} tag</h3>
          <p className="text-sm text-gray-500">
            Use tags to organize your links.{" "}
            <a
              href="https://dub.co/help/article/how-to-use-tags#what-is-a-tag"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-gray-800"
            >
              Learn more
            </a>
          </p>
        </div>
      </div>

      <form
        onSubmit={async (e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          setSaving(true);
          fetch(endpoint.url, {
            method: endpoint.method,
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              // Create expects 'tag', edit expects 'name', so provide both
              name: data.name,
              tag: data.name,
              color: data.color,
            }),
          }).then(async (res) => {
            if (res.status === 200 || res.status === 201) {
              posthog.capture(props ? "tag_edited" : "tag_created", {
                tag_id: data.id,
                tag_name: data.name,
                tag_color: data.color,
              });
              await Promise.all([
                mutate(`/api/tags?workspaceId=${workspaceId}`),
                props
                  ? mutate(
                      (key) =>
                        typeof key === "string" && key.startsWith("/api/links"),
                      undefined,
                      { revalidate: true },
                    )
                  : null,
              ]);
              toast.success(endpoint.successMessage);
              setShowAddEditTagModal(false);
            } else {
              const { error } = await res.json();
              toast.error(error.message);
            }
            setSaving(false);
          });
        }}
        className="flex flex-col space-y-6 bg-gray-50 px-4 py-8 text-left sm:rounded-b-2xl sm:px-16"
      >
        <div>
          <label htmlFor="name" className="flex items-center space-x-2">
            <p className="block text-sm font-medium text-gray-700">Tag Name</p>
          </label>
          <div className="mt-2 flex rounded-md shadow-sm">
            <input
              name="name"
              id="name"
              type="text"
              required
              autoFocus={!isMobile}
              autoComplete="off"
              className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
              placeholder="New Tag"
              value={name}
              onChange={(e) => {
                setData({ ...data, name: e.target.value });
              }}
            />
          </div>
        </div>

        <div>
          <label htmlFor="name" className="flex items-center space-x-2">
            <p className="block text-sm font-medium text-gray-700">Tag Color</p>
            <InfoTooltip content={`A color to make your tag stand out.`} />
          </label>
          <RadioGroup
            defaultValue={color}
            onValueChange={(value: TagColorProps) => {
              setData({ ...data, color: value });
            }}
            className="mt-2 flex flex-wrap gap-3"
          >
            {COLORS_LIST.map(({ color: colorOption, css }) => (
              <div key={colorOption} className="flex items-center">
                <RadioGroupItem
                  value={colorOption}
                  id={colorOption}
                  className="peer pointer-events-none absolute opacity-0"
                />
                <Label
                  htmlFor={colorOption}
                  className={cn(
                    "cursor-pointer whitespace-nowrap rounded-md px-2 py-0.5 text-sm capitalize ring-current peer-focus-visible:ring-offset-2",
                    css,
                    color === colorOption && "ring-2",
                  )}
                >
                  {colorOption}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <Button
          disabled={saveDisabled}
          loading={saving}
          text={props ? "Save changes" : "Create tag"}
        />
      </form>
    </Modal>
  );
}

function AddTagButton({
  setShowAddEditTagModal,
}: {
  setShowAddEditTagModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { slug, plan, tagsLimit } = useWorkspace();
  const { tags } = useTags();
  const exceededTags = tags && tagsLimit && tags.length >= tagsLimit;

  return (
    <div>
      <Button
        variant="primary"
        text="Add Tag"
        className="h-9 rounded-lg"
        disabledTooltip={
          exceededTags ? (
            <TooltipContent
              title={`You can only add up to ${tagsLimit} tag${
                tagsLimit === 1 ? "" : "s"
              } on the ${capitalize(plan)} plan. Upgrade to add more tags`}
              cta="Upgrade"
              href={`/${slug}/upgrade`}
            />
          ) : undefined
        }
        onClick={() => setShowAddEditTagModal(true)}
      />
    </div>
  );
}

export function useAddEditTagModal({ props }: { props?: TagProps } = {}) {
  const [showAddEditTagModal, setShowAddEditTagModal] = useState(false);

  const AddEditTagModalCallback = useCallback(() => {
    return (
      <AddEditTagModal
        showAddEditTagModal={showAddEditTagModal}
        setShowAddEditTagModal={setShowAddEditTagModal}
        props={props}
      />
    );
  }, [showAddEditTagModal, setShowAddEditTagModal]);

  const AddTagButtonCallback = useCallback(() => {
    return <AddTagButton setShowAddEditTagModal={setShowAddEditTagModal} />;
  }, [setShowAddEditTagModal]);

  return useMemo(
    () => ({
      setShowAddEditTagModal,
      AddEditTagModal: AddEditTagModalCallback,
      AddTagButton: AddTagButtonCallback,
    }),
    [setShowAddEditTagModal, AddEditTagModalCallback, AddTagButtonCallback],
  );
}
