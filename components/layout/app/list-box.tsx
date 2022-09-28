import { Fragment, useMemo } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { Tick, ChevronUpDown, PlusCircle } from "@/components/shared/icons";
import { useRouter } from "next/router";
import BlurImage from "@/components/shared/blur-image";
import useSWR from "swr";
import { fetcher } from "@/lib/utils";
import { ProjectProps } from "@/lib/types";
import { useSession } from "next-auth/react";
import { useAddProjectModal } from "@/components/app/modals/add-project-modal";

export default function ListBox() {
  const { data: projects } = useSWR<ProjectProps[]>("/api/projects", fetcher);

  const { setShowAddProjectModal, AddProjectModal } = useAddProjectModal({});

  const router = useRouter();

  const { data: session } = useSession();

  const selected = useMemo(() => {
    const { slug } = router.query;
    return (
      projects?.find((project) => project.slug === slug) || {
        name: session?.user?.name || session?.user?.email || "User",
        slug: "/",
      }
    );
  }, [router, projects, session]);

  if (!projects || !router.isReady)
    return (
      <div className="w-52 h-9 px-2 rounded-lg bg-gray-100 animate-pulse flex justify-end items-center">
        <ChevronUpDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
      </div>
    );

  return (
    <div className="w-52 -mt-1">
      <AddProjectModal />
      <Listbox
        value={selected}
        onChange={(e) => {
          if (e.slug !== "Add a new project") {
            router.push(`/${e.slug}`);
          }
        }}
      >
        <div className="relative mt-1">
          <Listbox.Button className="relative w-full rounded-lg bg-white hover:bg-gray-100 py-1.5 pl-3 pr-10 text-left focus:outline-none text-sm active:scale-95 transition-all duration-75">
            <div className="flex justify-start items-center space-x-3">
              <BlurImage
                src={
                  selected.slug === "/"
                    ? session?.user?.image ||
                      `https://avatars.dicebear.com/api/micah/${session?.user?.email}.svg`
                    : `https://avatar.tobi.sh/${selected.slug}`
                }
                alt={selected.name}
                className="w-8 h-8 flex-shrink-0 rounded-full overflow-hidden border border-gray-300"
                width={48}
                height={48}
              />
              <span className="block truncate font-medium">
                {selected.name}
              </span>
            </div>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDown
                className="h-4 w-4 text-gray-400"
                aria-hidden="true"
              />
            </span>
          </Listbox.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Listbox.Options className="absolute mt-1 max-h-60 w-60 overflow-auto rounded-md bg-white p-2 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {projects.map(({ name, slug }) => (
                <Listbox.Option
                  key={slug}
                  className={`relative flex items-center space-x-2 cursor-pointer p-2 rounded-md hover:bg-gray-100 active:scale-95 ${
                    selected.slug === slug ? "font-medium" : ""
                  } transition-all duration-75`}
                  value={{ name, slug }}
                >
                  <BlurImage
                    src={`https://avatar.tobi.sh/${slug}`}
                    alt={name}
                    className="w-7 h-7 flex-shrink-0 rounded-full overflow-hidden border border-gray-300"
                    width={48}
                    height={48}
                  />
                  <span
                    className={`block truncate ${
                      selected.slug === slug ? "font-medium" : "font-normal"
                    }`}
                  >
                    {name}
                  </span>
                  {selected.slug === slug ? (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-black">
                      <Tick className="h-5 w-5" aria-hidden="true" />
                    </span>
                  ) : null}
                </Listbox.Option>
              ))}
              <Listbox.Option
                key="add"
                onClick={() => setShowAddProjectModal(true)}
                value={{ name: "Add a new project", slug: "Add a new project" }}
                className="flex items-center space-x-2 w-full cursor-pointer p-2 rounded-md hover:bg-gray-100 active:scale-95 transition-all duration-75"
              >
                <PlusCircle className="w-7 h-7 text-gray-600" />
                <span className="block truncate">Add a new project</span>
              </Listbox.Option>
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
}
