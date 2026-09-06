'use client';

import { useEffect, useRef, useState } from 'react';
import { Map as MapIcon, MapPin, Navigation, Search } from 'lucide-react';
import type { Map as LeafletMap, CircleMarker, Circle } from 'leaflet';
import 'leaflet/dist/leaflet.css';

export function EventLiveMap() {
  const element = useRef<HTMLElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Posizione disattivata');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!enabled || !element.current) return;
    let cancelled = false;
    let instance: LeafletMap | undefined;
    let observer: ResizeObserver | undefined;
    void import('leaflet').then((L) => {
      if (cancelled || !element.current) return;
      instance = L.map(element.current, { scrollWheelZoom: false }).setView([43.843, 10.505], 15);
      map.current = instance;
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        className: 'cosmora-night-tiles',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).on('tileerror', () => setError('Alcune parti della mappa non sono disponibili. Controlla la connessione.')).addTo(instance);
      observer = new ResizeObserver(() => instance?.invalidateSize());
      observer.observe(element.current);
      setReady(true);
    }).catch(() => setError('Impossibile caricare la mappa. Ricarica la pagina per riprovare.'));
    return () => { cancelled = true; observer?.disconnect(); instance?.remove(); map.current = null; };
  }, [enabled]);

  useEffect(() => {
    if (!tracking || !ready) return;
    let watch: number | undefined;
    let point: CircleMarker | undefined;
    let accuracy: Circle | undefined;
    let cancelled = false;
    const stop = () => { if (watch !== undefined) navigator.geolocation.clearWatch(watch); };
    const onHidden = () => { if (document.hidden) { stop(); setTracking(false); setStatus('Posizione sospesa: riattivala quando vuoi.'); } };
    document.addEventListener('visibilitychange', onHidden);
    void import('leaflet').then((L) => {
      if (cancelled) return;
      if (!navigator.geolocation) { setStatus('Posizione non supportata da questo dispositivo.'); setTracking(false); return; }
      setStatus('Cerco la tua posizione…');
      watch = navigator.geolocation.watchPosition(({ coords }) => {
        if (cancelled || !map.current) return;
        const position: [number, number] = [coords.latitude, coords.longitude];
        if (!point) {
          accuracy = L.circle(position, { radius: coords.accuracy, color: '#c084fc', weight: 1, fillOpacity: 0.1 }).addTo(map.current);
          point = L.circleMarker(position, { radius: 8, color: '#fff', weight: 3, fillColor: '#ec4899', fillOpacity: 1 }).addTo(map.current);
          map.current.setView(position, 16, { animate: false });
        } else { point.setLatLng(position); accuracy?.setLatLng(position).setRadius(coords.accuracy); }
        setStatus(`Posizione attiva · precisione circa ${Math.round(coords.accuracy)} m`);
      }, (e) => {
        stop(); setTracking(false);
        setStatus(e.code === 1 ? 'Permesso negato. Puoi usare la mappa senza GPS.' : 'Posizione non disponibile. Riprova all’aperto.');
      }, { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 });
    }).catch(() => { setTracking(false); setStatus('Posizione non disponibile. Riprova.'); });
    return () => { cancelled = true; stop(); point?.remove(); accuracy?.remove(); document.removeEventListener('visibilitychange', onHidden); };
  }, [tracking, ready]);

  const button = 'flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-violet-300/25 bg-[#18112e] px-4 py-3 text-sm font-semibold disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-pink-300';
  return <section className="space-y-4" aria-label="Mappa e stand">
    <div className="overflow-hidden rounded-[28px] border border-fuchsia-400/30 bg-[#100d22] shadow-[0_12px_45px_-20px_#a21caf]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <h2 className="flex items-center gap-2 text-base font-semibold"><MapIcon aria-hidden="true" className="size-5 text-pink-300" />Esplora Lucca</h2>
        <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-semibold tracking-wide text-violet-200">NIGHT MODE</span>
      </div>
      {!enabled ? <div className="flex min-h-[340px] flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top_right,#5b176b_0%,#20103e_40%,#0d1021_85%)] px-6 py-8 text-center">
        <div className="mb-5 grid size-16 place-items-center rounded-2xl border border-fuchsia-300/30 bg-fuchsia-400/10"><Navigation aria-hidden="true" className="size-8 text-fuchsia-300" /></div>
        <h3 className="text-2xl font-semibold">La città, a portata di mano</h3>
        <p className="mt-2 max-w-xs text-base text-violet-100/80">Esplora le strade sulla mappa reale di Lucca.</p>
        <button className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-violet-600 px-4 py-3 text-base font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pink-300" onClick={() => setEnabled(true)}><MapIcon aria-hidden="true" className="size-5" />Apri la mappa notturna</button>
        <p className="mt-4 text-xs leading-relaxed text-white/70">Aprendo la mappa, OpenStreetMap riceve IP e area visualizzata. Il GPS resta spento.</p>
      </div> : <>
        <div className="relative">
          <section ref={element} aria-label="Mappa interattiva di Lucca" className="cosmora-event-map relative z-0 h-[460px] max-h-[62svh] min-h-72 bg-[#111225]" />
          <div className="pointer-events-none absolute right-3 top-3 z-[500] rounded-xl border border-violet-300/25 bg-[#100c22]/95 px-3 py-2 text-xs text-violet-100">Mappa città · stand non collegati</div>
        </div>
        <div className="space-y-3 border-t border-violet-400/20 bg-gradient-to-r from-[#241035] to-[#121026] p-3">
          <div className="grid grid-cols-2 gap-2">
            <button disabled={!ready} className={button} onClick={() => { setTracking(!tracking); if (tracking) setStatus('Posizione disattivata'); }}><Navigation aria-hidden="true" className="size-4 shrink-0 text-pink-300" />{tracking ? 'Spegni GPS' : 'Dove sono'}</button>
            <button disabled={!ready} className={button} onClick={() => map.current?.setView([43.843, 10.505], 15, { animate: false })}><MapPin aria-hidden="true" className="size-4 shrink-0 text-violet-300" />Torna a Lucca</button>
          </div>
          <output className="block text-sm text-pink-200">{status}</output>
          {error && <p role="alert" className="text-sm text-amber-200">{error}</p>}
        </div>
      </>}
    </div>
    <details className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/75"><summary className="cursor-pointer font-medium text-violet-200">GPS e privacy</summary><p className="mt-2 leading-relaxed">Il GPS parte solo premendo “Dove sono”. COSMORA non salva la posizione. Il fornitore della mappa riceve l’area visualizzata. Il rilevamento si interrompe uscendo dalla pagina o passando in secondo piano. Nei padiglioni la precisione può diminuire.</p></details>
    <div className="rounded-3xl border border-violet-400/20 bg-gradient-to-br from-[#1b1230] to-[#0e1020] p-4">
      <label htmlFor="stand-search" className="flex items-center gap-2 text-base font-semibold"><Search aria-hidden="true" className="size-5 text-pink-300" />Espositori e stand</label>
      <input id="stand-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Nome o numero dello stand…" className="mt-3 min-h-12 w-full rounded-2xl border border-violet-300/20 bg-[#080918]/80 px-4 text-base placeholder:text-white/45 focus:outline-2 focus:outline-pink-400" />
      <output className="mt-3 block text-sm text-white/75">{query ? 'Ricerca non disponibile: catalogo non ancora collegato.' : 'In attesa del catalogo autorizzato degli espositori.'}</output>
    </div>
    <style>{`.cosmora-night-tiles { filter: invert(1) hue-rotate(230deg) saturate(.8) brightness(.85); } .cosmora-event-map .leaflet-control-attribution { background: #100c22; color: #e9d5ff; font-size: 12px; } .cosmora-event-map .leaflet-control-attribution a { color: #f9a8d4; } .cosmora-event-map .leaflet-bar { border: 1px solid #9b59b666; border-radius: 12px; overflow: hidden; } .cosmora-event-map .leaflet-bar a { background: #171128; color: #f9a8d4; border-color: #49305e; width: 44px; height: 44px; line-height: 44px; } .cosmora-event-map .leaflet-bar a:hover { background: #302044; }`}</style>
  </section>;
}
