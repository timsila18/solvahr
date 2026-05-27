"use client";

import { useEffect, useState } from "react";

export const INSTALL_REQUEST_EVENT = "solva-hr:install-app-request";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const PWA_INSTALL_DISMISSED_KEY = "solva-hr-pwa-install-dismissed-at";
const PWA_INSTALL_DISMISS_MS = 1000 * 60 * 60 * 24 * 7;

type InstallBannerMode = "native" | "ios" | "manual";

function isStandaloneMode() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafari() {
  if (typeof window === "undefined") {
    return false;
  }

  const ua = window.navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
  return isIos && isSafari;
}

function isDesktopViewport() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia?.("(min-width: 1024px)").matches === true;
}

function isDismissedRecently() {
  if (typeof window === "undefined") {
    return false;
  }

  const stored = window.localStorage.getItem(PWA_INSTALL_DISMISSED_KEY);
  if (!stored) {
    return false;
  }

  const timestamp = Number(stored);
  if (!Number.isFinite(timestamp)) {
    return false;
  }

  return Date.now() - timestamp < PWA_INSTALL_DISMISS_MS;
}

function markInstallDismissed() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, String(Date.now()));
}

export function PwaRegistrar() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installDismissed, setInstallDismissed] = useState(true);
  const [bannerMode, setBannerMode] = useState<InstallBannerMode | null>(null);
  const [showDesktopInstallButton, setShowDesktopInstallButton] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker.register("/sw.js");

    if (isStandaloneMode() || isDismissedRecently()) {
      setInstallDismissed(true);
    } else {
      setInstallDismissed(false);
    }

    const handler = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setBannerMode("native");
      setInstallDismissed(false);
      setShowDesktopInstallButton(isDesktopViewport());
    };

    const installedHandler = () => {
      setInstallEvent(null);
      setBannerMode(null);
      setInstallDismissed(true);
      setShowDesktopInstallButton(false);
      markInstallDismissed();
    };

    const requestHandler = () => {
      if (isStandaloneMode()) {
        return;
      }

      if (installEvent) {
        void handleInstall();
        return;
      }

      setBannerMode(isIosSafari() ? "ios" : "manual");
      setInstallDismissed(false);
    };

    const fallbackTimer = window.setTimeout(() => {
      if (isStandaloneMode() || isDismissedRecently()) {
        return;
      }
      if (installEvent) {
        return;
      }

      setBannerMode(isIosSafari() ? "ios" : "manual");
      setInstallDismissed(false);
      setShowDesktopInstallButton(isDesktopViewport());
    }, 2500);

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);
    window.addEventListener(INSTALL_REQUEST_EVENT, requestHandler);
    return () => {
      window.clearTimeout(fallbackTimer);
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
      window.removeEventListener(INSTALL_REQUEST_EVENT, requestHandler);
    };
  }, [installEvent]);

  async function handleInstall() {
    if (!installEvent) {
      return;
    }

    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") {
      setInstallEvent(null);
      setBannerMode(null);
      markInstallDismissed();
    } else {
      setInstallDismissed(true);
      markInstallDismissed();
    }
  }

  function handleDismiss() {
    setInstallDismissed(true);
    setShowDesktopInstallButton(false);
    markInstallDismissed();
  }

  return (
    <>
      {showDesktopInstallButton && installEvent && !isStandaloneMode() ? (
        <button
          className="pwa-install-desktop-button"
          onClick={() => void handleInstall()}
          type="button"
        >
          Install desktop app
        </button>
      ) : null}
      {!installDismissed && bannerMode ? (
        <div className="pwa-install-banner">
          <div>
            <strong>Install Solva HR</strong>
            <small>
              {bannerMode === "native"
                ? "Add Solva HR to this device for faster access, app-style opening, and a cleaner everyday workflow."
                : bannerMode === "ios"
                  ? "On iPhone or iPad, tap Share and choose Add to Home Screen to install Solva HR."
                  : "Use your browser menu and choose Install app or Add to Home Screen to keep Solva HR one tap away."}
            </small>
          </div>
          <div className="inline-actions">
            <button className="ghost-button" onClick={handleDismiss} type="button">
              Not now
            </button>
            {bannerMode === "native" ? (
              <button className="primary-button" onClick={() => void handleInstall()} type="button">
                Install app
              </button>
            ) : (
              <button className="primary-button" onClick={handleDismiss} type="button">
                Got it
              </button>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
