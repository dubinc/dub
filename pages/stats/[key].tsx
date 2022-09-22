import Stats from "@/components/stats";
import HomeLayout from "@/components/layout/home";

export default function StatsPage() {
  return (
    <HomeLayout>
      <div className="bg-gray-50">
        <Stats />
      </div>
    </HomeLayout>
  );
}
