export default function LinkCardPlaceholder() {
  return (
    <li className="flex items-center bg-white p-4 rounded-lg shadow hover:shadow-md transition-all">
      <div className="w-10 h-10 rounded-full mr-2 bg-gray-200 animate-pulse" />
      <div>
        <div className="flex items-center space-x-2 mb-2.5">
          <div className="w-28 h-5 rounded-md bg-gray-200 animate-pulse" />
          <div className="w-5 h-5 rounded-full bg-gray-200 animate-pulse" />
          <div className="w-20 h-5 rounded-md bg-gray-200 animate-pulse" />
        </div>
        <div className="w-72 h-4 rounded-md bg-gray-200 animate-pulse" />
      </div>
    </li>
  );
}
