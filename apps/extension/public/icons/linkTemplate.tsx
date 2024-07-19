const LinkTemplate = () => {
  return (
    <div className="mb-4 flex w-[400px] items-center rounded-md border border-gray-200 bg-white p-3 opacity-100 shadow-lg">
      <div className="mr-2 h-10 w-10 rounded-full bg-gray-200"></div>
      <div>
        <div className="mb-2.5 flex items-center space-x-2">
          <div className="h-6 w-28 rounded-md bg-gray-200"></div>
          <div className="h-6 w-6 rounded-full bg-gray-200"></div>
          <div className="h-6 w-28 rounded-md bg-gray-200"></div>
        </div>
        <div className="h-4 w-70 rounded-md bg-gray-200"></div>
      </div>
      <div className="ml-4 h-10 w-9 rounded-md bg-gray-200"></div>
    </div>
  );
};

export default LinkTemplate;
