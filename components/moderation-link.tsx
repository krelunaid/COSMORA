'use client';
import { useEffect, useState } from 'react';
import Link from '@/components/app-link';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { isModerationRole } from '@/lib/moderation';
import { useI18n } from '@/components/i18n-provider';

export function ModerationLink() {
  const { locale } = useI18n();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client) return;
    let active = true;
    void client.auth.getSession().then(({ data }) => { if (active) setVisible(isModerationRole(data.session?.user.app_metadata?.cosmora_role)); });
    const { data } = client.auth.onAuthStateChange((_event, session) => { if (active) setVisible(isModerationRole(session?.user.app_metadata?.cosmora_role)); });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  return visible ? <Link href="/moderation" className="flex min-h-12 items-center rounded-xl border border-violet-300/30 px-4 text-violet-200">{{ it: 'Moderazione', en: 'Moderation', fr: 'Modération', de: 'Moderation', es: 'Moderación' }[locale]}</Link> : null;
}
