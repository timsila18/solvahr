"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function PwaRegistrar() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installDismissed, setInstallDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker.register("/sw.js");

    const handler = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setInstallDismissed(false);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!installEvent) {
      return;
    }

    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") {
      setInstallEvent(null);
    }
  }

  if (!installEvent || installDismissed) {
    return null;
  }

  return (
    <div className="pwa-install-banner">
      <div>
        <strong>Install Solva HR</strong>
        <small>Add the ESS and approvals workspace to your home screen for a faster app-like flow.</small>
      </div>
      <div className="inline-actions">
        <button className="ghost-button" onClick={() => setInstallDismissed(true)} type="button">
          Not now
        </button>
        <button className="primary-button" onClick={() => void handleInstall()} type="button">
          Add to home screen
        </button>
      </div>
    </div>
  );
}
