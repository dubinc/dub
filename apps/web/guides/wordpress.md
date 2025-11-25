Follow these steps to add the Dub client-side script to your WordPress site:

- On your WordPress dashboard, navigate to the **Theme Editor** section under the **Appearance** menu.
- Open the **Theme Header (header.php)** file on the right column.
- Paste the Dub analytics script in the header area.
- Click on the **Update File** button to save the changes.

<!-- prettier-ignore -->
```html
<script
  defer
  src="https://www.dubcdn.com/analytics/script.js"
></script>
```

If you're using [Dub Partners](https://dub.co/docs/partners/quickstart) for affiliate management, you will also need to set up the `data-domains` property to enable [client-side click-tracking](https://dub.co/docs/sdks/client-side/features/client-side-click-tracking).

```html
<script
  defer
  src="https://www.dubcdn.com/analytics/script.js"
  data-domains='{"refer":"yourcompany.link"}'
></script>
```
