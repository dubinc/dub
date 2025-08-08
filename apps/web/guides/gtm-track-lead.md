Configure Google Tag Manager server-side tracking

To track lead conversion events with Google Tag Manager, you'll need to set up a server container and configure a custom client to handle Dub conversion events.

## Step 1: Set up GTM Server Container

In Google Tag Manager, you'll need to use an existing server container or [create a new one](https://youtu.be/waqBSk3vkko). Server containers are the foundation for server-side tracking and allow you to process events before they reach their final destinations.

- If you already have a server container set up, you can use that
- If not, [create a new server container in your GTM workspace](https://developers.google.com/tag-platform/learn/sst-fundamentals/4-sst-setup-container)

## Step 2: Import Dub GTM Server Client Template

Inside your GTM server container, navigate to the **Templates** tab. Under **Client Templates**, click the **New** button.

![GTM New Client Template](https://mintlify.s3.us-west-1.amazonaws.com/dub/images/conversions/google-tag-manager/gtm-new-client-template.png)

This will open up the **Template Editor**. In the top right corner, click on the **⋮** button and select **Import**.

![GTM Import Client Template](https://mintlify.s3.us-west-1.amazonaws.com/dub/images/conversions/google-tag-manager/gtm-import-client-template.png)

Download the [gtm-server-client-template/template.tpl](https://raw.githubusercontent.com/dubinc/gtm-server-client-template/main/template.tpl) file and upload it to the Template Editor. You'll see a preview of the template:

![GTM Server Client Template](https://mintlify.s3.us-west-1.amazonaws.com/dub/images/conversions/google-tag-manager/gtm-server-client-template.png)

Click the **Save** button in the top right to save the template.

## Step 3: Create Dub Server Client

Next, you'd want to create a new GTM Server Client using the imported template.

In your GTM server container, navigate to the **Clients** tab and click **New**.

![GTM New Server Client](https://mintlify.s3.us-west-1.amazonaws.com/dub/images/conversions/google-tag-manager/gtm-new-server-client.png)

This will open up the client configuration page, where you can choose a client type to begin setup. Under **Custom**, select the **Dub GTM Server Client** template that you created in step 2.

![GTM Choose Client Type](https://mintlify.s3.us-west-1.amazonaws.com/dub/images/conversions/google-tag-manager/gtm-choose-client-type.png)

Make sure your client configuration is set to the following:

- Client Name: **Dub GTM Server Client**
- Priority: **0**
- Request Path: `/dub/track`
- Debug Logging: (optional)

![GTM Server Client](https://mintlify.s3.us-west-1.amazonaws.com/dub/images/conversions/google-tag-manager/gtm-server-client.png)

> Clients in GTM Server are adapters that act as bridges between the software running on a user's device and your server container. They receive requests and transform them into events that can be processed by tags.

## Step 4: Import Dub GTM Server Tag Template

Next, you'll want to import the Dub GTM Server Tag template to handle lead tracking.

In your GTM server container, navigate to the **Templates** tab once again. Under **Tag Templates**, click the **New** button.

![GTM New Tag Template](https://mintlify.s3.us-west-1.amazonaws.com/dub/images/conversions/google-tag-manager/gtm-new-tag-template.png)

This will open up the **Template Editor**. In the top right corner, click on the **⋮** button and select **Import**.

![GTM Import Client Template](https://mintlify.s3.us-west-1.amazonaws.com/dub/images/conversions/google-tag-manager/gtm-import-client-template.png)

Download the [gtm-server-tag-template/template.tpl](https://raw.githubusercontent.com/dubinc/gtm-server-tag-template/main/template.tpl) file and upload it to the Template Editor. You'll see a preview of the template:

![Dub GTM Server Tag Template](https://mintlify.s3.us-west-1.amazonaws.com/dub/images/conversions/google-tag-manager/gtm-server-tag-template.png)

Click the **Save** button in the top right to save the template.

## Step 5: Add Lead Tracking Tag

Last but not least, you'll want to create a new GTM Server Tag using the imported template.

In your GTM server container, navigate to the **Tags** tab and click **New**.

![GTM New Tag](https://mintlify.s3.us-west-1.amazonaws.com/dub/images/conversions/google-tag-manager/gtm-new-tag.png)

This will open up the tag configuration page. Under **Tag Configuration**, select the **Dub Conversion Tag** server tag template that you created in step 4.

![GTM Choose Tag Type](https://mintlify.s3.us-west-1.amazonaws.com/dub/images/conversions/google-tag-manager/gtm-choose-tag-type.png)

Make sure your tag configuration is set to the following:

- **Dub API Key**: Your [Dub API key](https://dub.co/docs/api-reference/tokens) (starts with `dub_`)
- **Event**: Select "Track lead" from the dropdown
- **Click ID**: `clickId` from the Dub Server Client event data
- **Customer External ID**: `customerExternalId` from the event data
- **Event Name**: `eventName` from the event data (e.g., "Sign Up")
- **Customer Name**: `customerName` from the event data
- **Customer Email**: Map to the `customerEmail` from the event data
- **Customer Avatar**: Map to the `customerAvatar` from the event data (optional)
- **Event Quantity**: Map to the `eventQuantity` from the event data (default: 1)

![GTM Lead Tracking Tag](https://mintlify.s3.us-west-1.amazonaws.com/dub/images/conversions/google-tag-manager/gtm-track-lead-tag.png)

Under the **Triggering** section, configure when the tag should fire:

- Click **+** to add a new trigger
- Select **Custom Event** as the trigger type
- Set the **Event Name** to match the event name from the Dub Server Client. Default is `dub_conversion`
- Add a condition to filter for lead events:
  - **Variable**: Select a variable that contains the event type
  - **Operator**: Equals
  - **Value**: "Sign Up"
- Name the trigger "Dub Lead Event Trigger" and save it

## Testing your setup

You can test your GTM server setup by sending a curl request to your server URL with the appropriate query parameters:

```bash
curl "https://server-side-tagging-xxx-uc.a.run.app/dub/track/lead?\
dub_id=pAzVZ3jzwZXcLMDT&\
eventName=Sign%20Up&\
customerExternalId=user_1K0RN3SDNAC0C1WCW4BGRS3EW&\
customerName=John%20Doe&\
customerEmail=john@example.com&\
customerAvatar=https://example.com/avatar.jpg&\
eventQuantity=1&\
mode=async"
```
