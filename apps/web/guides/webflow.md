Follow these steps to add Dub client-side script to your Webflow site:

- On your project's page, click on the **Webflow logo** in the left-hand side menu and choose **Project Settings**.
- Choose **[Custom Code](https://university.webflow.com/lesson/custom-code-in-the-head-and-body-tags?topics=site-settings)** from the menu and paste the Dub analytics script in the **Head Code** section.
- Click on the **Save Changes** button and then **Publish** your changes.

<!-- prettier-ignore -->
```html
<script
  defer
  src="https://www.dubcdn.com/analytics/script.js"
></script>
```

If you're using [Dub Partners](/partners/quickstart) for affiliate management, you will also need to set up the `data-domains` property to enable [client-side click-tracking](/sdks/client-side/features/client-side-click-tracking).

```html
<script
  defer
  src="https://www.dubcdn.com/analytics/script.js"
  data-domains='{"refer":"yourcompany.link"}'
></script>
```
