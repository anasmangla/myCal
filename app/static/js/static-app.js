import { initStaticApp } from './core/app-init.js';

function forceDesktopViewportOnMobile() {
  const mobileUserAgentPattern = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isMobileUserAgent = mobileUserAgentPattern.test(navigator.userAgent || '');
  const coarsePointerTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  if (!isMobileUserAgent && !coarsePointerTouch) return;

  const viewportMeta = document.querySelector('meta[name="viewport"]');
  if (!viewportMeta) return;

  viewportMeta.setAttribute('content', 'width=1280');
}

document.addEventListener('DOMContentLoaded', () => {
  forceDesktopViewportOnMobile();
  initStaticApp();
});
