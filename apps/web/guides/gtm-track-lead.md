Configure Google Tag Manager to track lead events when a new user signs up.

To track lead conversion events with Google Tag Manager, you'll need to set up a server container and configure a custom client to handle Dub conversion events.

## Step 1: Set up Server Container

In Google Tag Manager, you'll need to use an existing server container or create a new one. Server containers are the foundation for server-side tracking and allow you to process events before they reach their final destinations.

- If you already have a server container set up, you can use that
- If not, create a new server container in your GTM workspace

## Step 2: Import Dub GTM Server Client Template

Add a new Client Template using the import option:

1. In your server container, go to **Client Templates** → **New**
2. Click **Import** and upload the [Dub GTM Server Client template](https://github.com/dubinc/gtm-server-client-template)

![GTM Server Client Template](https://mintlify.s3.us-west-1.amazonaws.com/dub/images/conversions/google-tag-manager/gtm-server-client-template.png)

## Step 3: Create Dub Server Client

Next, create a new Client using the imported template:

1. In your server container, go to **Clients** → **New**
2. Select the **Dub GTM Server Client** template from **Custom**
3. Name the client "Dub Server Client" (or any descriptive name)
4. Set the **Request Path** to `/dub/track`
5. Optionally enable debug logging for troubleshooting

![GTM Server Client](https://mintlify.s3.us-west-1.amazonaws.com/dub/images/conversions/google-tag-manager/gtm-server-client.png)

> Clients in GTM Server are adapters that act as bridges between the software running on a user's device and your server container. They receive requests and transform them into events that can be processed by tags.

## Step 4: Import Dub GTM Server Tag Template

Next, import the Dub GTM Server Tag template to handle lead tracking:

1. In your server container, go to **Tags** → **New**
2. Click **Import** and upload the [Dub GTM Server Tag template](https://github.com/dubinc/gtm-server-tag-template)
3. This template is specifically designed to send conversion events directly to Dub

![Dub GTM Server Tag Template](https://mintlify.s3.us-west-1.amazonaws.com/dub/images/conversions/google-tag-manager/gtm-server-tag-template.png)

## Step 5: Add Lead Tracking Tag

Next, create a new tag for lead tracking with proper mapping:

1. In your server container, go to **Tags** → **New**
2. Select the **Dub Conversion Tag** template from **Custom**
3. Name the tag "Dub Lead Tracking" (or any descriptive name)
4. Configure the tag settings:

- **Dub API Key**: Enter your [Dub API key](https://dub.co/docs/api-reference/tokens) (starts with `dub_`)
- **Event**: Select "Track lead"
- **Click ID**: Map to the `clickId` from the Dub Server Client event data
- **Customer External ID**: Map to the `customerExternalId` from the event data
- **Event Name**: Map to the `eventName` from the event data (e.g., "Sign Up")
- **Customer Name**: Map to the `customerName` from the event data
- **Customer Email**: Map to the `customerEmail` from the event data
- **Customer Avatar**: Map to the `customerAvatar` from the event data (optional)
- **Event Quantity**: Map to the `eventQuantity` from the event data (default: 1)
- **Mode**: Set to "async" for non-blocking requests

5. **Triggering**: Configure when the tag should fire:

- Click **Triggering** in the tag configuration
- Click **+** to add a new trigger
- Select **Custom Event** as the trigger type
- Set the **Event Name** to match the event name from the Dub Server Client. Default is `dub_conversion`
- Add a condition to filter for lead events:
  - **Variable**: Select a variable that contains the event type
  - **Operator**: Equals
  - **Value**: "Sign Up"
- Name the trigger "Dub Lead Event Trigger" and save it
