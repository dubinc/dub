import { dub } from "@/lib/dub";
import { Button, CopyButton, Wordmark } from "@dub/ui";
import { CursorRays, Globe, InvoiceDollar, UserCheck } from "@dub/ui/src/icons";
import { COUNTRIES, getPrettyUrl, timeAgo } from "@dub/utils";
import { Mail } from "lucide-react";
import ReferralsPageClient from "./page-client";

export default function ReferralsPage({
  params: { slug },
}: {
  params: { slug: string };
}) {
  const link = `https://refer.dub.co/${slug}`;
  return (
    <ReferralsPageClient>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-black">
          Referrals
        </h1>
        <div className="my-4 grid gap-4 lg:grid-cols-3">
          <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-tr from-gray-100 p-4">
            <h2 className="text-2xl font-semibold text-gray-900">500 clicks</h2>
            <p className="text-sm text-gray-500">Referral Bonus</p>
            <Wordmark className="absolute inset-x-0 -bottom-8 mx-auto h-20 text-gray-200" />
          </div>
          <div className="flex gap-3 lg:col-span-2 lg:flex-col">
            <p className="font-medium text-gray-700">Why refer someone?</p>
            <div className="flex items-center gap-x-2">
              <UserCheck className="size-4 text-gray-500" />
              <p className="text-sm text-gray-500">
                Earn 500 extra clicks quota per month per signup (up to 16,000
                total)
              </p>
            </div>
            <div className="flex items-center gap-x-2">
              <InvoiceDollar className="size-4 text-gray-500" />
              <p className="text-sm text-gray-500">
                Earn 10% recurring revenue per paying customer (up to 1 year)
              </p>
            </div>
            <div className="grid gap-1.5">
              <p className="text-xs text-gray-500">Referral Link</p>
              <div className="grid max-w-md grid-cols-[1fr_auto] gap-x-2">
                <div className="flex h-9 items-center justify-between gap-x-2 rounded-lg border border-gray-300 bg-white py-1.5 pl-4 pr-2">
                  <p className="text-sm text-gray-500">{getPrettyUrl(link)}</p>
                  <CopyButton
                    value={link}
                    variant="neutral"
                    className="p-1.5 text-gray-500"
                  />
                </div>
                <Button
                  text="Invite via email"
                  icon={<Mail className="size-4" />}
                  className="h-9 rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="w-full border-t border-gray-200" />
        <ClickEvents slug={slug} />
      </div>
    </ReferralsPageClient>
  );
}

async function ClickEvents({ slug }: { slug: string }) {
  const events = await dub.events.list({
    domain: "refer.dub.co",
    key: slug,
  });

  return (
    <div className="grid divide-y divide-gray-200">
      {events.map(({ clickId, country, timestamp }) => (
        <div key={clickId} className="flex justify-between gap-2 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <CursorRays className="size-4 text-gray-500" />
            <p>Someone from</p>
            {country ? (
              <img
                alt={country}
                src={`https://flag.vercel.app/m/${country}.svg`}
                className="h-3 w-5"
              />
            ) : (
              <Globe className="size-3 text-gray-700" />
            )}
            <p>
              <span className="font-semibold text-gray-700">
                {country ? COUNTRIES[country] : "Planet Earth"}
              </span>{" "}
              clicked on your link
            </p>
          </div>
          <p className="text-sm text-gray-400">
            {timeAgo(new Date(timestamp), { withAgo: true })}
          </p>
        </div>
      ))}
    </div>
  );
}
