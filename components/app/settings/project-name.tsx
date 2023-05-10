import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { LoadingDots } from "#/ui/icons";
import useProject from "@/lib/swr/use-project";
import { mutate } from "swr";

export default function ProjectName() {
  const router = useRouter();
  const { slug } = router.query as { slug: string };

  const { name } = useProject();
  const [newName, setNewName] = useState<string | undefined | null>(null);
  useEffect(() => {
    setNewName(name);
  }, [name]);
  const [saving, setSaving] = useState(false);
  const saveDisabled = useMemo(() => {
    return saving || !newName || newName === name;
  }, [saving, newName, name]);

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
            name: newName,
          }),
        }).then(async (res) => {
          setSaving(false);
          if (res.status === 200) {
            mutate("/api/projects");
            mutate(`/api/projects/${slug}`);
            toast.success("Successfully updated project name!");
          }
        });
      }}
      className="rounded-lg border border-gray-200 bg-white"
    >
      <div className="relative flex flex-col space-y-3 p-5 sm:p-10">
        <h2 className="text-xl font-medium">Project Name</h2>
        <div className="flex items-center space-x-1">
          <p className="text-sm text-gray-500">
            This is the name of your project on Dub.
          </p>
        </div>
        <div />
        {newName ? (
          <input
            type="text"
            name="project-name"
            id="project-name"
            placeholder="Dub"
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
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
