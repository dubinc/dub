'use client';

export const runtime = "edge";

// Configurable landing page to break out of WebViews on iOS
// It would be better if the universal link page, attempted to click the equivalent scheme. No interstitial page necessary.
export default function ExitPage({ params }: { params: { placeholder: string } }) {

  // TODO: map a universal link with an equivalent scheme, this requires knowledge about how the target app works
  // for now, lets hard code the amazon app since it's well documented
  let scheme = "com.amazon.mobile.shopping.web://www.amazon.com/gp/product/B0DF49NM7Q";
  let universalLink = "https://a.co/d/cfDKBco";

  // TODO: filter by apps we want to try to break out of. 
  // Running this outside a webview results in a poor user experience.
  // Also dependent on the host apps webview config, by default universal links work and schemes do not!
  // Many apps disable universal links and enable schemes.

  return (
  <div>
    <a id="myscheme" href={ `${scheme}` }>scheme</a>
    <br/>
    <a id="mylink" href={ `${universalLink}` }>link</a>
    <script type="text/javascript">
      document.getElementById(`myscheme`)?.click(); 
      document.getElementById(`mylink`)?.click();
    </script>
  </div>
  );
}
