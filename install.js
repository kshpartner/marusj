const installBox = document.querySelector("#installBox");
const installButton = document.querySelector("#installAppButton");
const installGuide = document.querySelector("#installGuide");

let deferredInstallPrompt = null;

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function showInstallGuide(message, showButton) {
  if (!installBox || isStandaloneMode()) return;

  installGuide.textContent = message;
  installButton.hidden = !showButton;
  installBox.hidden = false;
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    const hadController = Boolean(navigator.serviceWorker.controller);
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));

    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    }

    if (hadController && !sessionStorage.getItem("maruCacheRefreshDone")) {
      sessionStorage.setItem("maruCacheRefreshDone", "true");
      window.location.reload();
    }
  });
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  showInstallGuide("Android Chrome에서 홈 화면 앱으로 설치할 수 있습니다.", true);
});

installButton?.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installButton.hidden = true;
});

window.addEventListener("appinstalled", () => {
  if (installBox) installBox.hidden = true;
});

if (isIosDevice() && !isStandaloneMode()) {
  showInstallGuide("iPhone에서는 Safari 공유 버튼을 누른 뒤 '홈 화면에 추가'를 선택하세요.", false);
}
