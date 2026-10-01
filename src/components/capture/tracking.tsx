import { useEffect } from "react";

export function TrackingScripts({ metaPixelId, gaId }: { metaPixelId?: string | null; gaId?: string | null }) {
  useEffect(() => {
    if (metaPixelId) {
      const script = document.createElement("script");
      script.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixelId}');fbq('track','PageView');`;
      document.head.appendChild(script);
    }
    if (gaId) {
      const script1 = document.createElement("script");
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
      script1.async = true;
      document.head.appendChild(script1);

      const script2 = document.createElement("script");
      script2.innerHTML = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${gaId}');`;
      document.head.appendChild(script2);
    }
  }, [metaPixelId, gaId]);

  return null;
}
