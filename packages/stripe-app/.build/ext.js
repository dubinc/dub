"use strict";
var __StripeExtExports = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // ../../node_modules/.pnpm/@stripe+ui-extension-sdk@8.8.1_@remote-ui+rpc@1.4.5_stripe@13.11.0/node_modules/@stripe/ui-extension-sdk/version.js
  var require_version = __commonJS({
    "../../node_modules/.pnpm/@stripe+ui-extension-sdk@8.8.1_@remote-ui+rpc@1.4.5_stripe@13.11.0/node_modules/@stripe/ui-extension-sdk/version.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.UI_VERSION = exports.SDK_VERSION = void 0;
      exports.SDK_VERSION = "8.8.1";
      exports.UI_VERSION = "^32.7.0";
    }
  });

  // .build/manifest.js
  var manifest_exports = {};
  __export(manifest_exports, {
    BUILD_TIME: () => BUILD_TIME,
    default: () => manifest_default
  });
  __reExport(manifest_exports, __toESM(require_version()));
  var BUILD_TIME = "2024-05-07 18:04:51.75841 +0530 IST m=+137.022160334";
  var manifest_default = {
    "id": "com.example.dub",
    "version": "0.0.7",
    "name": "Dub",
    "icon": "",
    "permissions": [
      {
        "permission": "event_read",
        "purpose": "Informs Dub when the app has been installed and uninstalled."
      },
      {
        "permission": "webhook_read",
        "purpose": "Allows Dub to read webhooks"
      },
      {
        "permission": "customer_read",
        "purpose": "Allows Dub to read customer information."
      },
      {
        "permission": "charge_read",
        "purpose": "Allows Dub to read charge information."
      }
    ],
    "ui_extension": {
      "content_security_policy": {
        "connect-src": null,
        "image-src": null,
        "purpose": ""
      }
    },
    "allowed_redirect_uris": [
      "https://4eaf-103-181-40-87.ngrok-free.app/api/stripe-app/callback"
    ],
    "stripe_api_access_type": "oauth",
    "distribution_type": "public"
  };
  return __toCommonJS(manifest_exports);
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vbm9kZV9tb2R1bGVzLy5wbnBtL0BzdHJpcGUrdWktZXh0ZW5zaW9uLXNka0A4LjguMV9AcmVtb3RlLXVpK3JwY0AxLjQuNV9zdHJpcGVAMTMuMTEuMC9ub2RlX21vZHVsZXMvQHN0cmlwZS9zcmMvdmVyc2lvbi50cyIsICJtYW5pZmVzdC5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFtudWxsLCAiXG5cblxuZXhwb3J0ICogZnJvbSAnQHN0cmlwZS91aS1leHRlbnNpb24tc2RrL3ZlcnNpb24nO1xuZXhwb3J0IGNvbnN0IEJVSUxEX1RJTUUgPSAnMjAyNC0wNS0wNyAxODowNDo1MS43NTg0MSArMDUzMCBJU1QgbT0rMTM3LjAyMjE2MDMzNCc7XG5cbmV4cG9ydCB7ICB9O1xuXG5leHBvcnQgZGVmYXVsdCB7XG4gIFwiaWRcIjogXCJjb20uZXhhbXBsZS5kdWJcIixcbiAgXCJ2ZXJzaW9uXCI6IFwiMC4wLjdcIixcbiAgXCJuYW1lXCI6IFwiRHViXCIsXG4gIFwiaWNvblwiOiBcIlwiLFxuICBcInBlcm1pc3Npb25zXCI6IFtcbiAgICB7XG4gICAgICBcInBlcm1pc3Npb25cIjogXCJldmVudF9yZWFkXCIsXG4gICAgICBcInB1cnBvc2VcIjogXCJJbmZvcm1zIER1YiB3aGVuIHRoZSBhcHAgaGFzIGJlZW4gaW5zdGFsbGVkIGFuZCB1bmluc3RhbGxlZC5cIlxuICAgIH0sXG4gICAge1xuICAgICAgXCJwZXJtaXNzaW9uXCI6IFwid2ViaG9va19yZWFkXCIsXG4gICAgICBcInB1cnBvc2VcIjogXCJBbGxvd3MgRHViIHRvIHJlYWQgd2ViaG9va3NcIlxuICAgIH0sXG4gICAge1xuICAgICAgXCJwZXJtaXNzaW9uXCI6IFwiY3VzdG9tZXJfcmVhZFwiLFxuICAgICAgXCJwdXJwb3NlXCI6IFwiQWxsb3dzIER1YiB0byByZWFkIGN1c3RvbWVyIGluZm9ybWF0aW9uLlwiXG4gICAgfSxcbiAgICB7XG4gICAgICBcInBlcm1pc3Npb25cIjogXCJjaGFyZ2VfcmVhZFwiLFxuICAgICAgXCJwdXJwb3NlXCI6IFwiQWxsb3dzIER1YiB0byByZWFkIGNoYXJnZSBpbmZvcm1hdGlvbi5cIlxuICAgIH1cbiAgXSxcbiAgXCJ1aV9leHRlbnNpb25cIjoge1xuICAgIFwiY29udGVudF9zZWN1cml0eV9wb2xpY3lcIjoge1xuICAgICAgXCJjb25uZWN0LXNyY1wiOiBudWxsLFxuICAgICAgXCJpbWFnZS1zcmNcIjogbnVsbCxcbiAgICAgIFwicHVycG9zZVwiOiBcIlwiXG4gICAgfVxuICB9LFxuICBcImFsbG93ZWRfcmVkaXJlY3RfdXJpc1wiOiBbXG4gICAgXCJodHRwczovLzRlYWYtMTAzLTE4MS00MC04Ny5uZ3Jvay1mcmVlLmFwcC9hcGkvc3RyaXBlLWFwcC9jYWxsYmFja1wiXG4gIF0sXG4gIFwic3RyaXBlX2FwaV9hY2Nlc3NfdHlwZVwiOiBcIm9hdXRoXCIsXG4gIFwiZGlzdHJpYnV0aW9uX3R5cGVcIjogXCJwdWJsaWNcIlxufTtcbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFhLGNBQUEsY0FBYztBQUNkLGNBQUEsYUFBYTs7Ozs7QUNEMUI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUdBLCtCQUFjO0FBQ1AsTUFBTSxhQUFhO0FBSTFCLE1BQU8sbUJBQVE7QUFBQSxJQUNiLE1BQU07QUFBQSxJQUNOLFdBQVc7QUFBQSxJQUNYLFFBQVE7QUFBQSxJQUNSLFFBQVE7QUFBQSxJQUNSLGVBQWU7QUFBQSxNQUNiO0FBQUEsUUFDRSxjQUFjO0FBQUEsUUFDZCxXQUFXO0FBQUEsTUFDYjtBQUFBLE1BQ0E7QUFBQSxRQUNFLGNBQWM7QUFBQSxRQUNkLFdBQVc7QUFBQSxNQUNiO0FBQUEsTUFDQTtBQUFBLFFBQ0UsY0FBYztBQUFBLFFBQ2QsV0FBVztBQUFBLE1BQ2I7QUFBQSxNQUNBO0FBQUEsUUFDRSxjQUFjO0FBQUEsUUFDZCxXQUFXO0FBQUEsTUFDYjtBQUFBLElBQ0Y7QUFBQSxJQUNBLGdCQUFnQjtBQUFBLE1BQ2QsMkJBQTJCO0FBQUEsUUFDekIsZUFBZTtBQUFBLFFBQ2YsYUFBYTtBQUFBLFFBQ2IsV0FBVztBQUFBLE1BQ2I7QUFBQSxJQUNGO0FBQUEsSUFDQSx5QkFBeUI7QUFBQSxNQUN2QjtBQUFBLElBQ0Y7QUFBQSxJQUNBLDBCQUEwQjtBQUFBLElBQzFCLHFCQUFxQjtBQUFBLEVBQ3ZCOyIsCiAgIm5hbWVzIjogW10KfQo=
