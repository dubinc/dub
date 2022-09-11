import { useState } from "react";
import ConfigurationsPlaceholder from "./configurations-placeholder";

function getVerificationError(verificationResponse) {
  try {
    const error = verificationResponse.error;
    if (error.code === "missing_txt_record") {
      return null;
    }
    return error.message;
  } catch {
    return null;
  }
}

const Configurations = ({ data }) => {
  const [recordType, setRecordType] = useState("CNAME");
  if (!data) {
    return <ConfigurationsPlaceholder />;
  }

  if (!data.verified) {
    const txtVerification = data.verification.find((x) => x.type === "TXT");
    return (
      <>
        <div className="flex items-center space-x-3 my-3 px-2 sm:px-10">
          <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            shapeRendering="geometricPrecision"
          >
            <circle cx="12" cy="12" r="10" fill="#d32f2f" />
            <>
              <path d="M15 9l-6 6" stroke="white" />
              <path d="M9 9l6 6" stroke="white" />
            </>
          </svg>
          <p className={`text-red-700 font-medium text-sm`}>
            Domain is pending verification
          </p>
        </div>

        <div className="w-full border-t border-gray-100 mt-5 mb-8" />

        <div className="px-2 sm:px-10">
          <div className="flex justify-start space-x-4">
            <div
              onClick={() => setRecordType("CNAME")}
              className={`${
                recordType == "CNAME"
                  ? "text-black border-black"
                  : "text-gray-400 border-white"
              } text-sm border-b-2 pb-1 transition-all ease duration-150`}
            >
              Verify Domain Ownership
            </div>
          </div>
          <div className="my-3 text-left">
            <p className="my-5 text-sm">
              Please set the following TXT record on {data.apexName} to prove
              ownership of {data.name}:
            </p>
            <div className="flex justify-start items-start space-x-10 bg-gray-50 p-2 rounded-md">
              <div>
                <p className="text-sm font-bold">Type</p>
                <p className="text-sm font-mono mt-2">{txtVerification.type}</p>
              </div>
              <div>
                <p className="text-sm font-bold">Name</p>
                <p className="text-sm font-mono mt-2">
                  {txtVerification.domain.slice(
                    0,
                    txtVerification.domain.length - data.apexName.length - 1
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm font-bold">Value</p>
                <p className="text-sm font-mono mt-2">
                  <span className="text-ellipsis">{txtVerification.value}</span>
                </p>
              </div>
            </div>
            {getVerificationError(data.verificationResponse) && (
              <p className="my-5 text-sm text-red-700">
                {getVerificationError(data.verificationResponse)}
              </p>
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center space-x-3">
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          shapeRendering="geometricPrecision"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            fill={data.configured ? "#1976d2" : "#d32f2f"}
          />
          {data.configured ? (
            <>
              <path
                d="M8 11.8571L10.5 14.3572L15.8572 9"
                fill="none"
                stroke="white"
              />
            </>
          ) : (
            <>
              <path d="M15 9l-6 6" stroke="white" />
              <path d="M9 9l6 6" stroke="white" />
            </>
          )}
        </svg>
        <p
          className={`${
            data.configured
              ? "text-black font-normal"
              : "text-red-700 font-medium"
          } text-sm`}
        >
          {data.configured ? "Valid" : "Invalid"} Configuration
        </p>
      </div>

      {!data.configured && (
        <>
          <div className="w-full border-t border-gray-100 mt-5 mb-8" />

          <div className="px-2 sm:px-10">
            <div className="flex justify-start space-x-4">
              <button
                onClick={() => setRecordType("CNAME")}
                className={`${
                  recordType == "CNAME"
                    ? "text-black border-black"
                    : "text-gray-400 border-white"
                } text-sm border-b-2 pb-1 transition-all ease duration-150`}
              >
                CNAME Record (subdomains)
              </button>
              <button
                onClick={() => setRecordType("A")}
                className={`${
                  recordType == "A"
                    ? "text-black border-black"
                    : "text-gray-400 border-white"
                } text-sm border-b-2 pb-1 transition-all ease duration-150`}
              >
                A Record (apex domain)
              </button>
            </div>
            <div className="my-3 text-left">
              <p className="my-5 text-sm">
                Set the following record on your DNS provider to continue:
              </p>
              <div className="flex justify-start items-center space-x-10 bg-gray-50 p-2 rounded-md">
                <div>
                  <p className="text-sm font-bold">Type</p>
                  <p className="text-sm font-mono mt-2">{recordType}</p>
                </div>
                <div>
                  <p className="text-sm font-bold">Name</p>
                  <p className="text-sm font-mono mt-2">
                    {recordType == "CNAME" ? "www" : "@"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-bold">Value</p>
                  <p className="text-sm font-mono mt-2">
                    {recordType == "CNAME"
                      ? `cname.platformize.co`
                      : `76.76.21.21`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Configurations;
