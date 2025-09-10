import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import Script from 'next/script'

export const metadata: Metadata = {
  title: 'ОТРОДЬЯ',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-32.v5.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.v5.png', sizes: '16x16', type: 'image/png' }
    ],
    apple: [{ url: '/apple-touch-icon.v5.png', sizes: '180x180', type: 'image/png' }]
  },
  manifest: '/site.webmanifest'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
              {/* PATCH: PRELOAD HEAD START */}
        <style>{`
html.preload-active body { overflow: hidden; }
html.preload-active body > *:not(#preloader) { visibility: hidden !important; }
#preloader { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; z-index: 99999; background: #000; }
#preloader .spinner { width: 42px; height: 42px; border-radius: 50%; border: 3px solid rgba(255,255,255,.25); border-top-color: #fff; animation: spin 1s linear infinite; }
#preloader .label { color: #fff; font: 500 12px/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin-top: 12px; opacity: .8; letter-spacing: .02em; }
@keyframes spin { to { transform: rotate(1turn); } }
        `}</style>
        <Script id="ios-preload-lock" strategy="beforeInteractive">{`
(function () {
  try {
    var isiOS = /iP(hone|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var smallScreen = Math.min(screen.width, screen.height) <= 900;
    if (isiOS && smallScreen) {
      document.documentElement.classList.add('preload-active');
    }
  } catch (e) {}
})();
        `}</Script>
        {/* PATCH: PRELOAD HEAD END */}
      </head>
      <body>
        {/* PATCH: PRELOADER HTML START */}
        <div id="preloader" aria-live="polite" hidden>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'12px'}}>
            <div className="spinner" role="status" aria-label="Загрузка"></div>
            <div className="label">Загрузка…</div>
          </div>
        </div>
        {/* PATCH: PRELOADER HTML END */}
        {/* PATCH: PRELOADER JS START */}
        <Script id="ios-preloader-main" strategy="afterInteractive">{`
(function () {
  function isIOSPhone() {
    var ua = navigator.userAgent;
    var isiOS = /iP(hone|od)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var small = Math.min(screen.width, screen.height) <= 900;
    return isiOS && small;
  }
  if (!isIOSPhone()) return;

  var root = document.documentElement;
  var preloader = document.getElementById('preloader');
  if (preloader) preloader.style.display = 'flex';

  // Preferred: explicit marks
  var targets = Array.prototype.slice.call(document.querySelectorAll('[data-preload-bg]'));

  // Heuristic: scan likely hero containers if none explicitly marked
  if (!targets.length) {
    var selectors = [
      'section', 'header', 'main', '.hero', '.banner', '.masthead', '.header', '.cover', '.landing', '.intro', '.top', '.home-hero', '.jumbotron'
    ].join(',');
    var candidates = Array.prototype.slice.call(document.querySelectorAll(selectors));
    targets = candidates.slice(0, 12);
    if (document.body) targets.unshift(document.body);
  }

  // Extract URLs from background-image (supports multiple layers)
  var urlSet = new Set();
  function collectUrls(el) {
    if (!el) return;
    var style = getComputedStyle(el);
    var bg = (style && style.backgroundImage) || '';
    if (!bg || bg === 'none') return;
    var re = /url\((?:'|\")?(.*?)(?:'|\")?\)/g; var m;
    while ((m = re.exec(bg)) !== null) {
      var src = m[1];
      if (src && !/gradient|^about:blank$/.test(src)) urlSet.add(src);
    }
  }
  for (var i = 0; i < targets.length; i++) collectUrls(targets[i]);

  if (!urlSet.size) return cleanup();

  var loaded = 0, total = urlSet.size;
  function onDone() { if (++loaded >= total) cleanup(); }

  urlSet.forEach(function (src) {
    var img = new Image();
    img.onload = onDone; img.onerror = onDone; img.src = src;
  });

  var SAFETY_TIMEOUT = 7000; // ms
  setTimeout(cleanup, SAFETY_TIMEOUT);

  function cleanup() {
    root.classList.remove('preload-active');
    if (preloader) preloader.style.display = 'none';
  }
})();
        `}</Script>
        {/* PATCH: PRELOADER JS END */}
        {children}</body>
    </html>
  )
}
