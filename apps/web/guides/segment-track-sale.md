Configuring Segment to track sale events when a user purchases your product or service.

If you’ve already set up the Dub (Actions) destination, you can skip the first two steps and jump straight to the **Add Mapping** section.

## Step 1: Add Dub (Actions) destination

Head to [Segment Dub (Actions)](https://app.segment.com/goto-my-workspace/destinations/catalog/actions-dub) and add the destination to your Segment workspace.

![Segment Dub (Actions) destination](https://mintlify.s3.us-west-1.amazonaws.com/dub/images/conversions/segment/segment-actions.png)

## Step 2: Configure Dub API Key

In the Dub (Actions) destination settings, fill out the following fields:

- **Name:** Enter a name to help you identify this destination in Segment.
- **API Key:** Enter your Dub API key. You can find this in the [Dub Dashboard](https://app.dub.co/settings/tokens).
- **Enable Destination:** Toggle this on to allow Segment to send data to Dub.

Once completed, click **Save Changes**.

![Segment Dub (Actions) Basic Settings](https://mintlify.s3.us-west-1.amazonaws.com/dub/images/conversions/segment/segment-basic-settings.png)

## Step 3: Add Mapping

Next, you’ll choose the **Track a sale** action from the list of available actions.

By default, this action is configured to send sale data to Dub when the **Event Name** is **Order Completed**.

![Segment Dub (Actions) Mapping](https://mintlify.s3.us-west-1.amazonaws.com/dub/images/conversions/segment/segment-track-sale-action.png)

Below the selected action, you’ll see the mapping for that action.

![Segment Dub (Actions) Mapping](https://mintlify.s3.us-west-1.amazonaws.com/dub/images/conversions/segment/segment-track-sale-mapping.png)

You can customize the trigger and mapping to fit the specific needs of your application.

Finally, click **Next** and then **Save and enable** to add the mapping to the destination.

## Step 4: Send sale events to Dub

On the server side, you’ll use the `@segment/analytics-node` SDK to send sale events to Segment.

Make sure to include relevant properties such as `userId`, `payment_processor`, `order_id`, `currency`, and `revenue` in the payload.

```javascript
import { Analytics } from "@segment/analytics-node";

const segment = new Analytics({
  writeKey: "<YOUR_SEGMENT_WRITE_KEY>",
});

segment.track({
  userId: id,
  event: "Order Completed",
  properties: {
    payment_processor: "stripe",
    order_id: "ORD_123",
    currency: "USD",
    revenue: 1000,
  },
  integrations: {
    All: true,
  },
});
```

Once the event is tracked, Segment will forward the sale data to Dub based on the mappings you’ve configured.
