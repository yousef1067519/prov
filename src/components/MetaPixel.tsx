'use client'

import Script from 'next/script'

// Meta (Facebook) Pixel — base code, site-wide. Renders nothing unless
// NEXT_PUBLIC_META_PIXEL_ID is set, so local/dev and un-configured deploys are
// unaffected. Fires PageView on load; the Purchase event is fired separately on
// /welcome after a successful Stripe checkout (see PurchaseEvent).
export default function MetaPixel() {
  const id = process.env.NEXT_PUBLIC_META_PIXEL_ID
  if (!id) return null
  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${id}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img height="1" width="1" style={{ display: 'none' }} alt=""
          src={`https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1`} />
      </noscript>
    </>
  )
}

// Fires a one-time Purchase conversion. Mount on the post-checkout page only.
export function firePurchase(value: number, currency = 'USD') {
  const w = window as unknown as { fbq?: (...a: unknown[]) => void }
  if (typeof w.fbq === 'function') {
    w.fbq('track', 'Purchase', { value, currency })
  }
}
