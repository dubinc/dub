You can add the Dub client-side script to your website same way you would add Google Analytics script or any other JavaScript code – by adding it in the `<head>` section of your HTML file.

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
