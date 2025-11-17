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

## Step 2: Create Lead Tracking Tag for Form Submissions

Next, create a tag to track leads when users submit forms on your website.

Create another **Custom HTML** tag with the following code:

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

    if (email) {
      // Track the lead event
      dubAnalytics.trackLead({
        eventName: "Sign Up",
        customerExternalId: email,
        customerName: name || undefined,
        customerEmail: email,
        clickId:  {{Dub ID Cookie}} || undefined,
      });
    }
  })();
</script>
```

Configure this tag to fire on **Form Submission** by creating a new trigger:

- Trigger Type: **Form Submission**
- This trigger fires on: **Some Forms** (or **All Forms** if you want to track all form submissions)
- Add conditions to specify which forms should trigger lead tracking

Name this tag "Dub Lead Tracking - Form Submission" and click **Save** to create the tag.

### Step 3: Create Lead Tracking Tag for Thank You Pages

For tracking leads on thank-you pages (recommended approach), create another **Custom HTML** tag:

```html
<script>
  (function () {
    // Get query parameters from URL
    var params = new URLSearchParams(window.location.search);
    var email = params.get("email");
    var name = params.get("name");

    // Only track if email is present
    if (email) {
      // Track the lead event
      dubAnalytics.trackLead({
        eventName: "Sign Up",
        customerExternalId: email,
        customerName: name || undefined,
        customerEmail: email,
        clickId: {{Dub ID Cookie}} || undefined,
      });
    }
  })();
</script>
```

Configure this tag to fire on specific pages by creating a **Page View** trigger with conditions:

- Trigger Type: **Page View**
- This trigger fires on: **Some Page Views**
- Add conditions like:
  - **Page URL** contains `/thank-you`
  - Or **Page Path** equals `/success`
  - Or whatever URL pattern matches your thank-you pages

Name this tag "Dub Lead Tracking - Thank You Page" and save it.

## Testing your setup

To test your GTM setup, you can use the **Preview** mode in Google Tag Manager:

1. **Enable Preview Mode**: In your GTM workspace, click the **Preview** button in the top right corner
2. **Enter your website URL** and click **Connect**
3. **Navigate to a page** with a form or your thank-you page
4. **Submit a test form** or visit the thank-you page with query parameters
5. **Check the GTM debugger** to see if your tags are firing correctly
