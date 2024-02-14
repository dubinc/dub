import {
  Dispatch,
  FormEvent,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import va from "@vercel/analytics";
import { mutate } from "swr";
import useProject from "@/lib/swr/use-project";
import useTags from "@/lib/swr/use-tags";
import { TagProps } from "@/lib/types";
import {
  Button,
  InfoTooltip,
  Logo,
  Modal,
  TooltipContent,
  useMediaQuery,
  useRouterStuff,
} from "@dub/ui";
import { HOME_DOMAIN, capitalize, cn } from "@dub/utils";
import { COLORS_LIST, randomBadgeColor } from "../links/tag-badge";
import { toast } from "sonner";

function AddEditTagButton({
  setShowAddEditTagModal,
}: {
  setShowAddEditTagModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { plan, tagsLimit } = useProject();
  const { tags } = useTags();
  const { queryParams } = useRouterStuff();

  const exceededTags = tags && tagsLimit && tags.length >= tagsLimit;

  return (
    <div>
      <Button
        variant="secondary"
        text="Add Tag"
        className="h-8 px-2"
        disabledTooltip={
          exceededTags ? (
            <TooltipContent
              title={`You can only add up to ${tagsLimit} tag${
                tagsLimit === 1 ? "" : "s"
              } on the ${capitalize(plan)} plan. Upgrade to add more tags`}
              cta="Upgrade"
              onClick={() => {
                queryParams({
                  set: {
                    upgrade: plan === "free" ? "pro" : "business",
                  },
                });
              }}
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

  const AddEditTagButtonCallback = useCallback(() => {
    return <AddEditTagButton setShowAddEditTagModal={setShowAddEditTagModal} />;
  }, [setShowAddEditTagModal]);

  return useMemo(
    () => ({
      setShowAddEditTagModal,
      AddEditTagModal: AddEditTagModalCallback,
      AddEditTagButton: AddEditTagButtonCallback,
    }),
    [setShowAddEditTagModal, AddEditTagModalCallback, AddEditTagButtonCallback],
  );
}

function AddEditTagModal({
  showAddEditTagModal,
  setShowAddEditTagModal,
  props,
}: {
  showAddEditTagModal: boolean;
  setShowAddEditTagModal: Dispatch<SetStateAction<boolean>>;
  props?: TagProps;
}) {
  const { slug: projectSlug } = useProject();

  const [data, setData] = useState<TagProps>(
    props || {
      id: "",
      name: "",
      color: randomBadgeColor(),
    },
  );
  const { id, name, color } = data;

  const endpoint = useMemo(() => {
    if (props) {
      return {
        method: "PUT",
        url: `/api/tags/${id}`,
        successMessage: "Successfully updated tag!",
      };
    } else {
      return {
        method: "POST",
        url: `/api/tags`,
        successMessage: "Successfully added tag!",
      };
    }
  }, [id]);

  const [saving, setSaving] = useState(false);

  const { isMobile } = useMediaQuery();

  return (
    <Modal
      showModal={showAddEditTagModal}
      setShowModal={setShowAddEditTagModal}
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 sm:px-16">
        <Logo />
        <h3 className="text-lg font-medium">Create a new tag</h3>
        <a
          href={`${HOME_DOMAIN}/help/article/how-to-use-tags#what-is-a-tag`}
          target="_blank"
          rel="noopener noreferrer"
          className="-translate-y-2 text-center text-xs text-gray-500 underline underline-offset-4 hover:text-gray-800"
        >
          What is a tag?
        </a>
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
              tag: data.name,
              color: data.color,
            }),
          }).then(async (res) => {
            if (res.status === 200) {
              // track tag creation event
              va.track("Created Tag");
              await mutate("/api/tags");
              toast.success(endpoint.successMessage);
              setShowAddEditTagModal(false);
            } else {
              toast.error(await res.text());
            }
            setSaving(false);
          });
        }}
        className="flex flex-col space-y-6 bg-gray-50 px-4 py-8 text-left sm:px-16"
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
              className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
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
          <div className="mt-2 flex flex-wrap gap-3">
            {COLORS_LIST.map(({ color: colorOption, css }) => (
              <div key={colorOption}>
                <label className="flex cursor-pointer items-center">
                  <input
                    type="radio"
                    name="color"
                    value={colorOption}
                    onChange={(e) => {
                      if (e.target.checked)
                        setData({ ...data, color: colorOption });
                    }}
                    className="peer pointer-events-none absolute opacity-0"
                  />
                  <span
                    aria-hidden="true"
                    className={cn(
                      css,
                      "whitespace-nowrap rounded-md px-2 py-0.5 text-sm capitalize ring-current peer-focus-visible:ring-offset-2",
                      color === colorOption && "ring-2",
                    )}
                  >
                    {colorOption}
                  </span>
                </label>
              </div>
            ))}
          </div>
        </div>

        <Button loading={saving} text="Create tag" />
      </form>
    </Modal>
  );
}
