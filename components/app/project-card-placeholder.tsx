export default function ProjectCardPlaceholder() {
  return (
    <div className="bg-white shadow rounded-lg p-6 flex justify-between hover:shadow-md transition-all">
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
        <div className="flex flex-col space-y-2.5">
          <div className="w-36 h-5 rounded-md bg-gray-200 animate-pulse" />
          <div className="flex space-x-2 items-center">
            <div className="w-20 h-5 rounded-md bg-gray-200 animate-pulse" />
            <div className="w-5 h-5 rounded-full bg-gray-200 animate-pulse" />
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <div className="w-10 h-5 rounded-md bg-gray-200 animate-pulse" />
      </div>
    </div>
  );
}
