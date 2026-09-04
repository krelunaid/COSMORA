export default function Loading() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] items-center justify-center bg-[#080918] p-6 text-white">
      <output className="text-center">
        <span className="mx-auto mb-4 block size-9 animate-spin rounded-full border-2 border-violet-400/20 border-t-pink-400 motion-reduce:animate-none" />
        <span className="text-base">Caricamento…</span>
      </output>
    </main>
  );
}
