"use client";

import { useLocale } from "@/components/AppProviders";
import { t } from "@/lib/i18n";
import { isIosDevice } from "@/lib/session";
import { installGateActive } from "@/lib/installGate";
import { useEffect, useState, type ReactNode } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function MaterialIcon({ name }: { name: "ios_share" | "more_vert" }) {
  return (
    <span
      aria-hidden
      className="material-symbols-outlined mx-1 inline-block align-[-0.25em] text-[1.35em] leading-none"
    >
      {name}
    </span>
  );
}

function StepList({ steps }: { steps: ReactNode[] }) {
  return (
    <ol className="mt-3 space-y-2">
      {steps.map((step, index) => (
        <li key={index} className="flex gap-3 text-sm leading-6 text-foreground">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-fg">
            {index + 1}
          </span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

export function InstallGate() {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [ios, setIos] = useState(false);
  const [safari, setSafari] = useState(true);
  const [chrome, setChrome] = useState(true);
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const gated = installGateActive();
    setOpen(gated);
    if (!gated) return;
    const ua = navigator.userAgent;
    const onIos = isIosDevice();
    setIos(onIos);
    setSafari(onIos && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua));
    setChrome(/Android/i.test(ua) && /Chrome|SamsungBrowser/i.test(ua) && !/EdgA|OPR/i.test(ua));
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!open) return null;

  const iosSteps = [
    <>
      {t(locale, "installIos1Before")}
      <MaterialIcon name="ios_share" />
      {t(locale, "installIos1After")}
    </>,
    t(locale, "installIos2"),
    t(locale, "installIos3"),
    t(locale, "installIos4"),
  ];
  const androidSteps = [
    <>
      {t(locale, "installAndroid1Before")}
      <MaterialIcon name="more_vert" />
      {t(locale, "installAndroid1After")}
    </>,
    t(locale, "installAndroid2"),
    t(locale, "installAndroid3"),
    t(locale, "installAndroid4"),
  ];

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setPromptEvent(null);
    if (choice.outcome === "accepted") setInstalled(true);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-title"
      className="fixed inset-0 z-[80] overflow-y-auto bg-background px-4 py-8"
      data-install-dialog=""
    >
      <div className="mx-auto w-full max-w-lg">
        <p className="text-[11px] tracking-[0.18em] text-accent">Scan&Wash</p>
        <h1 id="install-title" className="mt-3 text-2xl font-semibold leading-snug text-foreground">
          {t(locale, "installTitle")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">{t(locale, "installLead")}</p>
        {installed && (
          <p className="mt-4 rounded-2xl bg-accent/15 px-4 py-3 text-sm text-accent">
            {t(locale, "installAfter")}
          </p>
        )}
        <div className={`mt-6 grid gap-4 ${ios ? "" : "sm:grid-cols-1"}`}>
          {(ios ? ["ios", "android"] : ["android", "ios"]).map((kind) =>
            kind === "ios" ? (
              <section key="ios" className="rounded-3xl border border-line bg-surface p-5">
                <h2 className="text-lg font-semibold text-foreground">{t(locale, "installIos")}</h2>
                {ios && !safari && (
                  <p className="mt-2 text-sm leading-6 text-warn">{t(locale, "installIosNeedSafari")}</p>
                )}
                <StepList steps={iosSteps} />
              </section>
            ) : (
              <section key="android" className="rounded-3xl border border-line bg-surface p-5">
                <h2 className="text-lg font-semibold text-foreground">{t(locale, "installAndroid")}</h2>
                {!ios && !chrome && (
                  <p className="mt-2 text-sm leading-6 text-warn">{t(locale, "installAndroidNeedChrome")}</p>
                )}
                {promptEvent && (
                  <button
                    type="button"
                    onClick={() => void install()}
                    className="mt-4 w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-accent-fg hover:bg-accent-hover"
                  >
                    {t(locale, "installNow")}
                  </button>
                )}
                <StepList steps={androidSteps} />
              </section>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
