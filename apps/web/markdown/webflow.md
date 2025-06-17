# Webflow

> How to add @dub/analytics to your Webflow site

With `@dub/analytics`, you can track lead and sale conversions on your Webflow site, enabling you to measure the effectiveness of your marketing campaigns.

You can add the `@dub/analytics` script to your Webflow website same way you would add Google Analytics script or any other JavaScript code.

Follow these steps to add the script to your site:

* On your project's page, click on the **Webflow logo** in the left-hand side menu and choose **Project Settings**.
* Choose **[Custom Code](https://university.webflow.com/lesson/custom-code-in-the-head-and-body-tags?topics=site-settings)** from the menu and paste the Dub analytics script in the **Head Code** section.
* Click on the **Save Changes** button and then **Publish** your changes.

```html
<script src="https://www.dubcdn.com/analytics/script.js" defer></script>
```

If you're using [Dub Partners](/partners/quickstart) for affiliate management, you will also need to set up the `data-domains` property to enable [client-side click-tracking](/sdks/client-side/features/client-side-click-tracking).

```html
<script
  src="https://www.dubcdn.com/analytics/script.js"
  defer
  data-domains='{"refer":"yourcompany.link"}'
></script>
```

Read the [client-side click-tracking guide](/sdks/client-side/features/client-side-click-tracking) for more information.
