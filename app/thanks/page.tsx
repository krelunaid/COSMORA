'use client';
import { useI18n } from '@/components/i18n-provider';
import { MobileShell, MobileNav, ScreenHeader } from '@/components/mobile-shell';
import { PushSettings } from '@/components/native-push';
import { communityThanksMessages } from '@/lib/i18n/community-thanks';
export default function ThanksPage() {
  const { locale } = useI18n();
  const copy = communityThanksMessages[locale];
  return <MobileShell><ScreenHeader title="COSMORA 💜" back="/" /><article lang={locale} className="space-y-5 px-6 py-8 pb-28 text-base leading-relaxed text-white/85"><h1 className="text-2xl font-semibold text-white">{copy.title}</h1><p>{copy.intro}</p>{copy.paragraphs.map((p) => <p key={p}>{p}</p>)}<p className="font-semibold text-violet-200">{copy.closing}</p><p>{copy.signoff}<br />{copy.signature}</p><PushSettings /></article><MobileNav active="home" /></MobileShell>;
}
