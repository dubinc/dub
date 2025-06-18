import { NextPage } from "next";
import { redirect } from "next/navigation";
import { ALLOWED_REGIONS } from "../../constants/types.ts";

export async function generateStaticParams() {
  return ALLOWED_REGIONS.map((region) => ({ region }));
}

interface IParams {
  params: Promise<{ region: string }>;
}

const Page: NextPage<Readonly<IParams>> = async (props) => {
  const { region } = await props.params;

  if (!ALLOWED_REGIONS.includes(region)) {
    return redirect("/");
  }

  redirect("/bill");
};

export default Page;
