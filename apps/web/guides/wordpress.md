Follow these steps to add the Dub client-side script to your WordPress site:

- On your WordPress dashboard, navigate to the **Theme Editor** section under the **Appearance** menu.
- Open the **Theme Header (header.php)** file on the right column.
- Paste the Dub analytics script in the header area.
- Click on the **Update File** button to save the changes.

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
