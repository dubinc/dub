Configure Google Tag Manager for sale tracking

The following steps assume that you've already installed the Dub Analytics script through GTM.

## Step 1: Create a GTM Variable to read the dub_id Cookie

To read the `dub_id` cookie that Dub Analytics sets, you'll need to create a new **User-Defined Variable** in Google Tag Manager.

In your GTM workspace, navigate to the **Variables** section and click **New** to create a new variable.

Configure the variable with the following settings:

- **Variable Type**: Select **1st Party Cookie**
- **Cookie Name**: `dub_id`
- **Variable Name**: Name it "Dub ID Cookie"

Click **Save** to create the variable.

## Step 2: Tracking sale events

There are two ways to track sale events with Google Tag Manager:

- Order Confirmation Page Tracking (Recommended)
- Checkout Form Tracking

### Option 1: Order Confirmation Page Tracking (Recommended)

This method tracks sales when users land on an order confirmation or success page after completing a purchase. This approach is more reliable as it's less likely to be blocked by ad blockers and provides better data accuracy.

Create a **Custom HTML** tag with the following code:

```html
<script>
  (function () {
    // Get query parameters from URL
    var params = new URLSearchParams(window.location.search);
    var customerId = params.get("customer_id");
    var amount = params.get("amount");
    var invoiceId = params.get("invoice_id");

    // Get dub_id from cookie using GTM variable
    var clickId = {{Dub ID Cookie}} || "";

    // Only track the sale event if customer ID, amount, and clickId are present
    if (customerId && amount && clickId) {
      dubAnalytics.trackSale({
        eventName: "Purchase",
        customerExternalId: customerId,
        amount: parseInt(amount), // Amount in cents
        invoiceId: invoiceId || undefined,
        currency: "usd", // Customize as needed
        paymentProcessor: "stripe", // Customize as needed
        clickId: clickId,
      });
    }
  })();
</script>
```

> **Important**: Make sure to pass along the `customer_id` and `amount` query parameters to the order confirmation page so that the sale event can be attributed to the correct customer and purchase.

Configure this tag to fire on specific pages by creating a **Page View** trigger with conditions:

- Trigger Type: **Page View**
- This trigger fires on: **Some Page Views**
- Add conditions like:
  - **Page URL** contains `/order-confirmation`
  - Or **Page Path** equals `/checkout/success`
  - Or whatever URL pattern matches your order confirmation pages

Name this tag "Dub Sales Tracking - Order Confirmation" and save it.

### Option 2: Checkout Form Tracking

This method tracks sales immediately when users complete checkout forms on your website. Note that this approach may be less reliable due to ad blockers and timing issues.

Create a **Custom HTML** tag with the following code:

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

    // Get dub_id from cookie using GTM variable
    var clickId = {{Dub ID Cookie}} || "";

    // Only track the sale event if customer ID, amount, and clickId are present
    if (customerId && amount && clickId) {
      dubAnalytics.trackSale({
        eventName: "Purchase",
        customerExternalId: customerId,
        amount: parseInt(amount), // Amount in cents
        invoiceId: invoiceId || undefined,
        currency: "usd", // Customize as needed
        paymentProcessor: "stripe", // Customize as needed
        clickId: clickId,
      });
    }
  })();
</script>
```

> **Important**: You'll need to customize the DOM selectors
> (`getElementById('customer_id')`, `getElementById('amount')`, etc.) to match your actual
> form field IDs or use different methods to capture the checkout data based on your
> website's structure.

Configure this tag to fire on **Form Submission** by creating a new trigger:

- Trigger Type: **Form Submission**
- This trigger fires on: **Some Forms** (or **All Forms** if you want to track all form submissions)
- Add conditions to specify which forms should trigger sales tracking (e.g., checkout forms)

Name this tag "Dub Sales Tracking - Checkout Form" and save it.

## Testing your setup

To test your GTM setup, you can use the **Preview** mode in Google Tag Manager:

1. **Enable Preview Mode**: In your GTM workspace, click the **Preview** button in the top right corner
2. **Enter your website URL** and click **Connect**
3. **Test your chosen tracking method**:
   - **For Option 1 (Order Confirmation Page)**: Navigate to your order confirmation page with query parameters (e.g., `?customer_id=123&amount=5000&invoice_id=inv_123`)
   - **For Option 2 (Checkout Form)**: Navigate to a page with a checkout form and complete a test purchase
4. **Check the GTM debugger** to see if your tags are firing correctly

### Verify sales tracking

You can also verify that sales are being tracked by:

1. **Checking your browser's developer console** for any JavaScript errors
2. **Using the Network tab** to see if requests are being sent to Dub's analytics endpoint
3. **Viewing your Dub dashboard** to confirm that sale events are appearing in your analytics

### Common troubleshooting tips

- **Tag not firing**: Check that your triggers are configured correctly and that the conditions match your page structure
- **Missing publishable key**: Ensure you've replaced the placeholder with your actual publishable key
- **Missing query parameters** (Option 1): Ensure your checkout redirects to the order confirmation page with the required query parameters
- **Form data not captured** (Option 2): Verify that your DOM selectors match your actual form field IDs or names
