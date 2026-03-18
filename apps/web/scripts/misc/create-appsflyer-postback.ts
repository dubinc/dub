import "dotenv-flow/config";

async function main() {
  const baseUrl =
    "https://accurate-caribou-strictly.ngrok-free.app/api/appsflyer/webhook";

  const params = {
    appsFlyerId: "1234567890",
    clickId: "",
    customerName: "",
  };
}

main();

//https://accurate-caribou-strictly.ngrok-free.app/api/appsflyer/webhook?androidDeviceId={Android Device ID}&appId={App ID}&appName={App name}&appVersion={App version}&appsFlyerId={AppsFlyer ID}&attributedTouchType={Attributed touch type}&countryCode={Country code}&installTime={Install time}&postbackId={Postback ID}&clickId={Click ID}

// - `clickId` (required): unique clickId prop passed through by Dub
// - `customerExternalId` (required): unique ID of the customer in the app’s database
// - `customerName`: name of the customer
// - `customerEmail`: email of the customer
// - `customerAvatar`: avatar/profile pic of the customer
