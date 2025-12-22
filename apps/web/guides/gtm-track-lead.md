Configure Google Tag Manager for lead tracking

The following steps assume that you've already installed the Dub Analytics script through GTM.

## Step 1: Create a GTM Variable to read the dub_id Cookie

To read the `dub_id` cookie that Dub Analytics sets, you'll need to create a new **User-Defined Variable** in Google Tag Manager.

In your GTM workspace, navigate to the **Variables** section and click **New** to create a new variable.

Configure the variable with the following settings:

- **Variable Type**: Select **1st Party Cookie**
- **Cookie Name**: `dub_id`
- **Variable Name**: Name it "Dub ID Cookie"

Click **Save** to create the variable.

## Step 2: Tracking lead events

There are two ways to track lead events with Google Tag Manager:

- Thank You Page Tracking (Recommended)
- Form Submission Tracking

### Option 1: Thank You Page Tracking (Recommended)

This method tracks leads when users land on a thank-you or success page after completing a form. This approach is more reliable as it's less likely to be blocked by ad blockers and provides better data accuracy.

Create a **Custom HTML** tag with the following code:

```html
<script>
  (function () {
    // Get query parameters from URL
    var params = new URLSearchParams(window.location.search);
    var email = params.get("email");
    var name = params.get("name");

    // Get dub_id from cookie using GTM variable
    var clickId = {{Dub ID Cookie}} || "";

    // Only track the lead event if email and clickId are present
    if (email && clickId) {
      dubAnalytics.trackLead({
        eventName: "Sign Up",
        customerExternalId: email,
        customerName: name || email,
        customerEmail: email,
        clickId: clickId,
      });
    }
  })();
</script>
```

> **Important**: Make sure to pass along the `email` and `name` query parameters to the thank-you page so that the lead event can be attributed to the correct customer.

Configure this tag to fire on specific pages by creating a **Page View** trigger with conditions:

- Trigger Type: **Page View**
- This trigger fires on: **Some Page Views**
- Add conditions like:
  - **Page URL** contains `/thank-you`
  - Or **Page Path** equals `/success`
  - Or whatever URL pattern matches your thank-you pages

Name this tag "Dub Lead Tracking - Thank You Page" and save it.

### Option 2: Form Submission Tracking

This method tracks leads immediately when users submit forms on your website. Note that this approach may be less reliable due to ad blockers and timing issues.

Create a **Custom HTML** tag with the following code:

```html
<script>
  (function () {
    // Get form data - customize these selectors based on your form
    var name = document.getElementById("name")
      ? document.getElementById("name").value
      : "";
    var email = document.getElementById("email")
      ? document.getElementById("email").value
      : "";

    // Get dub_id from cookie using GTM variable
    var clickId = {{Dub ID Cookie}} || "";

    // Only track the lead event if email and clickId are present
    if (email && clickId) {
      dubAnalytics.trackLead({
        eventName: "Sign Up",
        customerExternalId: email,
        customerName: name || email,
        customerEmail: email,
        clickId: clickId,
      });
    }
  })();
</script>
```

> **Important**: You'll need to customize the DOM selectors
> (`getElementById('name')`, `getElementById('email')`) to match your actual
> form field IDs or use different methods to capture the form data based on your
> website's structure.

Configure this tag to fire on **Form Submission** by creating a new trigger:

- Trigger Type: **Form Submission**
- This trigger fires on: **Some Forms** (or **All Forms** if you want to track all form submissions)
- Add conditions to specify which forms should trigger lead tracking

Name this tag "Dub Lead Tracking - Form Submission" and save it.

## Testing your setup

To test your GTM setup, you can use the **Preview** mode in Google Tag Manager:

1. **Enable Preview Mode**: In your GTM workspace, click the **Preview** button in the top right corner
2. **Enter your website URL** and click **Connect**
3. **Test your chosen tracking method**:
   - **For Option 1 (Thank You Page)**: Navigate to your thank-you page with query parameters (e.g., `?email=test@example.com&name=Test User`)
   - **For Option 2 (Form Submission)**: Navigate to a page with a form and submit a test form
4. **Check the GTM debugger** to see if your tags are firing correctly

### Verify lead tracking

You can also verify that leads are being tracked by:

1. **Checking your browser's developer console** for any JavaScript errors
2. **Using the Network tab** to see if requests are being sent to Dub's analytics endpoint
3. **Viewing your Dub dashboard** to confirm that lead events are appearing in your analytics

### Common troubleshooting tips

- **Tag not firing**: Check that your triggers are configured correctly and that the conditions match your page structure
- **Missing publishable key**: Ensure you've replaced the placeholder with your actual publishable key
- **Missing query parameters** (Option 1): Ensure your form redirects to the thank-you page with the required query parameters
- **Form data not captured** (Option 2): Verify that your DOM selectors match your actual form field IDs or names
