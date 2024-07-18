const preferences = [
  {
    key: "links_usage_summary",
    title: "Monthly links usage summary",
  },
  {
    key: "domain_configuration",
    title: "Domain configuration warnings",
  },
];

export const NotificationPreferences = () => {
  return (
    <>
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex flex-col items-center justify-between gap-4 space-y-3 border-b border-gray-200 p-5 sm:flex-row sm:space-y-0 sm:p-10">
          <div className="flex max-w-screen-sm flex-col space-y-3">
            <h2 className="text-xl font-medium">Notifications</h2>
            <p className="text-sm text-gray-500">
              Adjust your notification preferences and choose which updates you
              want to receive.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 p-5 sm:p-10">
          {preferences.map((preference) => (
            <Preference key={preference.key} title={preference.title} />
          ))}
        </div>
      </div>
    </>
  );
};

const Preference = ({ key, title }: { key: string; title: string }) => {
  return (
    <div key={key}>
      <label className="flex items-center text-gray-700 font-medium">
        <input type="checkbox" />
        <span className="ml-2 text-sm">{title}</span>
      </label>
    </div>
  );
};
