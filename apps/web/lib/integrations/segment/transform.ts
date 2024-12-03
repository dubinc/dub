import { ClickEventWebhookData } from "@/lib/webhook/types";

export const formatEventForSegment = (data: ClickEventWebhookData) => {
  const { click, link } = data;

  return {
    event: "Link clicked",
    anonymousId: click.id,
    context: {
      link,
      click,
      campaign: {
        ...(link.utm_campaign && { name: link.utm_campaign }),
        ...(link.utm_source && { source: link.utm_source }),
        ...(link.utm_medium && { medium: link.utm_medium }),
        ...(link.utm_term && { term: link.utm_term }),
        ...(link.utm_content && { content: link.utm_content }),
      },
    },
    integrations: {
      Dub: {
        name: "Dub",
        version: "1.0.0",
      },
    },
  };
};

// {
//   "anonymousId": "507f191e810c19729de860ea",
//   "context": {
//     "active": true,
//     "app": {
//       "name": "InitechGlobal",
//       "version": "545",
//       "build": "3.0.1.545",
//       "namespace": "com.production.segment"
//     },

//     "ip": "8.8.8.8",
//     "library": {
//       "name": "analytics.js",
//       "version": "2.11.1"
//     },
//     "locale": "en-US",
//     "network": {
//       "bluetooth": false,
//       "carrier": "T-Mobile US",
//       "cellular": true,
//       "wifi": false
//     },
//     "os": {
//       "name": "iPhone OS",
//       "version": "8.1.3"
//     },
//     "page": {
//       "path": "/academy/",
//       "referrer": "",
//       "search": "",
//       "title": "Analytics Academy",
//       "url": "https://segment.com/academy/"
//     },
//     "referrer": {
//       "id": "ABCD582CDEFFFF01919",
//       "type": "dataxu"
//     },
//     "screen": {
//       "width": 320,
//       "height": 568,
//       "density": 2
//     },
//     "groupId": "12345",
//     "timezone": "Europe/Amsterdam",
//     "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
//     "userAgentData": {
//       "brands": [
//         {
//           "brand": "Google Chrome",
//           "version": "113"
//         },
//         {
//           "brand": "Chromium",
//           "version": "113"
//         },
//         {
//           "brand": "Not-A.Brand",
//           "version": "24"
//         }
//       ],
//       "mobile": false,
//       "platform": "macOS"
//     }
//   },
//   "integrations": {
//     "All": true,
//     "Mixpanel": false,
//     "Salesforce": false
//   },
//   "event": "Report Submitted",
//   "messageId": "022bb90c-bbac-11e4-8dfc-aa07a5b093db",
//   "receivedAt": "2015-12-10T04:08:31.909Z",
//   "sentAt": "2015-12-10T04:08:31.581Z",
//   "timestamp": "2015-12-10T04:08:31.905Z",
//   "type": "track",
//   "userId": "97980cfea0067",
//   "version": 2
// }
