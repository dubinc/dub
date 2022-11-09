import Globe from "@dub/components/globe";
import HomeLayout from "@/components/layout/home";

export default function Placeholder() {
  return (
    <HomeLayout domain={"dub.sh"}>
      <Globe domain={"dub.sh"} />
    </HomeLayout>
  );
}
