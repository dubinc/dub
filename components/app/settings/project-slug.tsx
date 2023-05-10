import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { LoadingDots } from "#/ui/icons";
import { mutate } from "swr";

export default function ProjectSlug() {
  const router = useRouter();
  const { slug } = router.query as { slug: string };

  const [newSlug, setNewSlug] = useState<string | undefined | null>(null);
  useEffect(() => {
    setNewSlug(slug);
  }, [slug]);
  const [saving, setSaving] = useState(false);
  const saveDisabled = useMemo(() => {
    return saving || !newSlug || newSlug === slug;
  }, [saving, newSlug, slug]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSaving(true);
        fetch(`/api/projects/${slug}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            newSlug,
          }),
        }).then(async (res) => {
          setSaving(false);
          if (res.status === 200) {
            mutate("/api/projects");
            router.push(`/${newSlug}/settings`);
            toast.success("Successfully updated project slug!");
          } else if (res.status === 422) {
            toast.error("Project slug already exists");
          } else {
            toast.error("Something went wrong");
          }
        });
      }}
      className="rounded-lg border border-gray-200 bg-white"
    >
      <div className="relative flex flex-col space-y-3 p-5 sm:p-10">
        <h2 className="text-xl font-medium">Project Slug</h2>
        <div className="flex items-center space-x-1">
          <p className="text-sm text-gray-500">
            This is your project's URL slug on Dub.
          </p>
        </div>
        <div />
        {newSlug ? (
          <input
            type="text"
            name="project-slug"
            id="project-slug"
            placeholder="dub"
            required
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            className="w-full max-w-md rounded-md border border-gray-300 text-sm text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500"
          />
        ) : (
          <div className="h-[2.35rem] w-full max-w-md animate-pulse rounded-md bg-gray-200" />
        )}
      </div>

      <div className="border-b border-gray-200" />

      <div className="px-5 py-4 sm:flex sm:items-center sm:justify-end sm:px-10">
        <button
          disabled={saveDisabled}
          className={`${
            saveDisabled
              ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
              : "border-black bg-black text-white hover:bg-white hover:text-black"
          } h-9 w-full rounded-md border text-sm transition-all duration-150 ease-in-out focus:outline-none sm:w-32`}
        >
          {saving ? <LoadingDots /> : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
