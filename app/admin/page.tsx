import { constructMetadata } from "#/lib/utils";
import AdminStuff from "./stuff";

export const metadata = constructMetadata({
  title: "Dub Admin",
});

export default function AdminPage() {
  return (
    <div className="mx-auto min-h-screen w-full max-w-screen-sm bg-white p-5">
      <AdminStuff />
    </div>
  );
}
