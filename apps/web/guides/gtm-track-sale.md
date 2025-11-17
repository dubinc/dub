Configure Google Tag Manager for sale tracking

The following steps assume that you've already installed the Dub Analytics script through GTM.

## Step 1: Create Sales Tracking Tag for Checkout Forms

Next, create a tag to track sales when users complete checkout forms on your website.

Create another **Custom HTML** tag with the following code:

```html
<script>
  (function () {
    // Get checkout data - customize these selectors based on your form
    var customerId = document.getElementById("customer_id")
      ? document.getElementById("customer_id").value
      : "";
    var amount = document.getElementById("amount")
      ? document.getElementById("amount").value
      : "";
    var invoiceId = document.getElementById("invoice_id")
      ? document.getElementById("invoice_id").value
      : "";

    // Only track if customer ID and amount are present
    if (customerId && amount) {
      // Track the sale event
      dubAnalytics.trackSale({
        eventName: "Purchase",
        customerExternalId: customerId,
        amount: parseInt(amount), // Amount in cents
        invoiceId: invoiceId || undefined,
        currency: "usd", // Customize as needed
        paymentProcessor: "stripe", // Customize as needed
      });
    }
  })();
</script>
```

Configure this tag to fire on **Form Submission** by creating a new trigger:

- Trigger Type: **Form Submission**
- This trigger fires on: **Some Forms** (or **All Forms** if you want to track all form submissions)
- Add conditions to specify which forms should trigger sales tracking (e.g., checkout forms)

Name this tag "Dub Sales Tracking - Checkout Form" and save it.

### Step 2: Create Sales Tracking Tag for Order Confirmation Pages

For tracking sales on order confirmation pages (recommended approach), create another **Custom HTML** tag:

```html
<script>
  (function () {
    // Get query parameters from URL
    var params = new URLSearchParams(window.location.search);
    var customerId = params.get("customer_id");
    var amount = params.get("amount");
    var invoiceId = params.get("invoice_id");

    // Only track if customer ID and amount are present
    if (customerId && amount) {
      // Track the sale event
      dubAnalytics.trackSale({
        eventName: "Purchase",
        customerExternalId: customerId,
        amount: parseInt(amount), // Amount in cents
        invoiceId: invoiceId || undefined,
        currency: "usd", // Customize as needed
        paymentProcessor: "stripe", // Customize as needed
      });
    }
  })();
</script>
```

Configure this tag to fire on specific pages by creating a **Page View** trigger with conditions:

- Trigger Type: **Page View**
- This trigger fires on: **Some Page Views**
- Add conditions like:
  - **Page URL** contains `/order-confirmation`
  - Or **Page Path** equals `/checkout/success`
  - Or whatever URL pattern matches your order confirmation pages

Name this tag "Dub Sales Tracking - Order Confirmation" and save it.

## Testing your setup

To test your GTM setup, you can use the **Preview** mode in Google Tag Manager:

1. **Enable Preview Mode**: In your GTM workspace, click the **Preview** button in the top right corner
2. **Enter your website URL** and click **Connect**
3. **Navigate to a checkout page** or your order confirmation page
4. **Complete a test purchase** or visit the confirmation page with query parameters
5. **Check the GTM debugger** to see if your tags are firing correctly

## Verify sales tracking

You can also verify that sales are being tracked by:

1. **Checking your browser's developer console** for any JavaScript errors
2. **Using the Network tab** to see if requests are being sent to Dub's analytics endpoint
3. **Viewing your Dub dashboard** to confirm that sale events are appearing in your analytics
