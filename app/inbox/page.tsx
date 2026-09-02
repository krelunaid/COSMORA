import Image from 'next/image';
import Link from '@/components/app-link';
import { Search } from 'lucide-react';
import { MobileNav, MobileShell } from '@/components/mobile-shell';
import { conversations } from '@/lib/conversations';

export default function InboxPage() {
  return (
    <MobileShell className="flex flex-col">
      <header className="flex h-[72px] shrink-0 items-center justify-between px-5">
        <h1 className="text-[24px] font-semibold">Inbox</h1>
        <Search className="size-6" />
      </header>

      <div className="min-h-0 flex-1 px-5">
        <div className="grid grid-cols-2 border-b border-white/10 text-center text-[13px] font-medium">
          <span className="border-b-2 border-pink-400 py-4 text-pink-300">
            Messages
          </span>
          <span className="py-4 text-white/55">Orders</span>
        </div>

        <div className="divide-y divide-white/8">
          {conversations.slice(0, 4).map((chat) => (
            <Link
              href={`/inbox/${chat.id}`}
              key={chat.id}
              className="flex min-h-[92px] items-center gap-4 py-5"
            >
              <span className="relative size-14 shrink-0 overflow-hidden rounded-full">
                <Image
                  src={chat.image}
                  alt=""
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold">{chat.name}</p>
                <p className="mt-1 truncate text-[13px] text-white/55">
                  {chat.preview}
                </p>
                <p className="mt-1.5 text-[11px] font-medium text-violet-300">
                  AI translation available
                </p>
              </div>
              <span className="text-[11px] text-white/40">{chat.time}</span>
            </Link>
          ))}
        </div>
      </div>

      <MobileNav active="inbox" />
    </MobileShell>
  );
}
