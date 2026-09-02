import {
  Camera,
  FileCheck2,
  MapPin,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

import { MobileShell, ScreenHeader } from '@/components/mobile-shell';

const steps = [
  {
    icon: UserCheck,
    title: 'Verified participants',
    text: 'Owner and renter must use verified accounts before confirming a rental.',
  },
  {
    icon: FileCheck2,
    title: 'Direct rental agreement',
    text: 'The agreement is between owner and renter. COSMORA supplies the booking and evidence tools as marketplace intermediary.',
  },
  {
    icon: Camera,
    title: 'Condition evidence',
    text: 'Both parties record guided photos at handover and return.',
  },
  {
    icon: MapPin,
    title: 'Public handover',
    text: 'Launch rentals are collected and returned at an agreed public venue or event point.',
  },
];

export default function RentalSafetyPage() {
  return (
    <MobileShell>
      <ScreenHeader
        title="Rental Safety"
        back="/marketplace/raiden-shogun-cosplay"
      />
      <div className="px-4 py-5">
        <div className="rounded-2xl border border-violet-400/20 bg-violet-400/5 p-4">
          <ShieldCheck className="size-7 text-violet-300" />
          <h1 className="mt-3 text-lg font-semibold">
            Local-first protected rentals
          </h1>
          <p className="mt-2 text-[10px] leading-4 text-white/55">
            COSMORA does not own the item and is not the lessor, carrier or
            insurer. Responsibilities, value, dates and return conditions are
            shown before confirmation.
          </p>
        </div>
        <div className="mt-4 space-y-2">
          {steps.map(({ icon: Icon, title, text }) => (
            <section
              key={title}
              className="flex gap-3 rounded-2xl border border-white/8 bg-[#111225] p-3"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-pink-400/10">
                <Icon className="size-4 text-pink-300" />
              </span>
              <div>
                <h2 className="text-[11px] font-medium">{title}</h2>
                <p className="mt-1 text-[9px] leading-4 text-white/45">
                  {text}
                </p>
              </div>
            </section>
          ))}
        </div>
        <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-[9px] leading-4 text-amber-100/70">
          The current checkout is a prototype. Real deposits, identity checks
          and payment collection remain disabled until an authorised payment
          provider and reviewed legal terms are connected.
        </p>
      </div>
    </MobileShell>
  );
}
