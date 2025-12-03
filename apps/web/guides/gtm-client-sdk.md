This guide will walk you through the process of integrating Dub with Google Tag Manager (GTM).

## Step 1: Create a New Tag

First, navigate to your Google Tag Manager account and create a new tag:

- Click on **Tags** in the left sidebar
- Click the **New** button
- Select **Custom HTML** as the tag type

![Dub GTM create tag](https://mintlify.s3.us-west-1.amazonaws.com/dub/images/conversions/google-tag-manager/gtm-select-custom-html-tag.png)

## Step 2: Add the Dub client-side script

In the Custom HTML section, you’ll need to add the Dub client-side script. Copy and paste the following code into the **HTML** field:

<!-- prettier-ignore -->
```html
<script>
  var script = document.createElement("script");
  script.defer = true;
  script.src = "https://www.dubcdn.com/analytics/script.js";
  document.getElementsByTagName("head")[0].appendChild(script);
</script>
```

![Dub GTM add script](https://mintlify.s3.us-west-1.amazonaws.com/dub/images/conversions/google-tag-manager/gtm-add-dub-script.png)

## Step 3: Configure the Trigger

To ensure the analytics script loads on all pages:

- Click on the **Triggering** section
- Select **All Pages** as the trigger type
- This will make the tag fire on every page load

## Step 4: Save and Publish

- Name your tag **Dub Analytics**
- Click **Save** to store your changes
- Click **Submit** to create a new version
- Finally, click **Publish** to activate the tag on your website
