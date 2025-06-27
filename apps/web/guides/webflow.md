Follow these steps to add Dub client-side script to your Webflow site:

- On your project's page, click on the **Webflow logo** in the left-hand side menu and choose **Project Settings**.
- Choose **[Custom Code](https://university.webflow.com/lesson/custom-code-in-the-head-and-body-tags?topics=site-settings)** from the menu and paste the Dub analytics script in the **Head Code** section.
- Click on the **Save Changes** button and then **Publish** your changes.

```html
<script
  src="https://www.dubcdn.com/analytics/script.js"
  defer
  data-domains='{"refer":"yourcompany.link"}'
></script>
```

Read the [client-side click-tracking guide](https://dub.co/docs/sdks/client-side/features/client-side-click-tracking) for more information.
