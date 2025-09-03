Follow these steps to add Dub client-side script to your Framer site:

- Go to your Framer project and open the **Project Settings** menu.
- Open the **General** tab and scroll down to the **Custom Code** section.
- Paste the Dub analytics script in the **Start of head tag** section.
- Click on the **Save** button to save the changes.

```html
<script
  src="https://www.dubcdn.com/analytics/script.js"
  defer
  data-domains='{"refer":"yourcompany.link"}'
></script>
```

Read the [client-side click-tracking guide](https://dub.co/docs/sdks/client-side/features/client-side-click-tracking) for more information.
