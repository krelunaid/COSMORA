'use client';

import { ArrowRight, Check } from 'lucide-react';
import Image from 'next/image';
import { localeLabels, type Locale } from '@/lib/i18n/config';
import { languageWelcomeMessages } from '@/lib/i18n/language-welcome';

const languageChoices = ['it', 'en', 'fr', 'de', 'es'] as const;
const safeAreaStyle = {
  paddingTop: 'max(2rem, env(safe-area-inset-top))',
  paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
  paddingLeft: 'max(1.5rem, env(safe-area-inset-left))',
  paddingRight: 'max(1.5rem, env(safe-area-inset-right))',
};

function CosmoraBrand() {
  return (
    <div className="flex flex-col items-center gap-4">
      <Image
        src="/brand/cosmora-app-icon.png"
        alt=""
        width={88}
        height={88}
        priority
        className="rounded-[24px] border border-white/10 shadow-xl"
      />
      <p className="brand-wordmark text-2xl font-bold tracking-[0.2em]">
        COSMORA
      </p>
    </div>
  );
}

export function LanguageStartup({ locale }: { locale: Locale }) {
  return (
    <main
      className="flex min-h-dvh items-center justify-center bg-[#080918] text-white"
      style={safeAreaStyle}
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-6">
        <CosmoraBrand />
        <output className="text-sm text-white/60">
          {languageWelcomeMessages[locale].loading}
        </output>
      </div>
    </main>
  );
}

export function LanguageWelcome({
  locale,
  onLocaleChange,
  onContinue,
}: {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  onContinue: () => void;
}) {
  const copy = languageWelcomeMessages[locale];
  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center bg-[#080918] text-white"
      style={safeAreaStyle}
      lang={locale}
    >
      <div className="w-full max-w-[430px]">
        <CosmoraBrand />
        <h1
          id="language-welcome-title"
          className="mt-8 text-center text-2xl font-semibold"
        >
          {copy.title}
        </h1>
        <p
          id="language-welcome-description"
          className="mt-3 text-center text-sm leading-relaxed text-white/65"
        >
          {copy.description}
        </p>
        <form
          className="mt-7"
          aria-labelledby="language-welcome-title"
          onSubmit={(event) => {
            event.preventDefault();
            onContinue();
          }}
        >
          <fieldset aria-describedby="language-welcome-description">
            <legend className="sr-only">{copy.language}</legend>
            <div className="grid gap-2.5">
              {languageChoices.map((choice) => (
                <label
                  key={choice}
                  className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition-colors focus-within:ring-2 focus-within:ring-pink-400 focus-within:ring-offset-2 focus-within:ring-offset-[#080918] ${locale === choice ? 'border-pink-400/80 bg-pink-400/10' : 'border-white/15 bg-white/[0.03] hover:bg-white/[0.06]'}`}
                >
                  <input
                    type="radio"
                    name="app-language"
                    value={choice}
                    checked={locale === choice}
                    onChange={() => onLocaleChange(choice)}
                    className="h-4 w-4 shrink-0 accent-pink-400"
                  />
                  <span lang={choice} className="flex-1 text-base font-medium">
                    {localeLabels[choice]}
                  </span>
                  {locale === choice && (
                    <Check
                      aria-hidden="true"
                      className="h-5 w-5 text-pink-300"
                    />
                  )}
                </label>
              ))}
            </div>
          </fieldset>
          <button
            type="submit"
            className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-violet-600 px-5 py-3 text-base font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pink-300"
          >
            {copy.continue}
            <ArrowRight aria-hidden="true" className="h-5 w-5" />
          </button>
          <p className="mt-4 text-center text-xs leading-relaxed text-white/55">
            {copy.changeLater}
          </p>
        </form>
      </div>
    </main>
  );
}
