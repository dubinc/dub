import HomeLayout from "@/components/layout/home";
import Stats from "@/components/stats";

export default function StatsPage() {
  return (
    <HomeLayout>
      <div className="bg-gray-50">
        <Stats />
      </div>
    </HomeLayout>
  );
}
