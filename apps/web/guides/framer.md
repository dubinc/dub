Follow these steps to add Dub client-side script to your Framer site:

- Go to your Framer project and open the **Project Settings** menu.
- Open the **General** tab and scroll down to the **Custom Code** section.
- Paste the Dub analytics script in the **Start of head tag** section.
- Click on the **Save** button to save the changes.

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
