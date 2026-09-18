import Link from "next/link";

export function SiteHeader({ connected }: { connected?: boolean }) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300/80">
            Dorm Laundry
          </p>
          <p className="truncate text-lg font-semibold text-white">
            คิวเครื่องซักผ้า
          </p>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/scan"
            className="rounded-full bg-cyan-300 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-200"
          >
            สแกน QR
          </Link>
          <Link
            href="/qrs"
            className="hidden rounded-full px-4 py-2 text-slate-300 hover:text-white sm:inline"
          >
            พิมพ์ QR
          </Link>
          {connected !== undefined && (
            <span
              className={`hidden items-center gap-2 rounded-full px-3 py-2 text-xs sm:inline-flex ${
                connected ? "text-emerald-300" : "text-amber-200"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  connected ? "bg-emerald-400" : "bg-amber-300"
                }`}
              />
              {connected ? "สด" : "กำลังเชื่อม"}
            </span>
          )}
        </nav>
      </div>
    </header>
  );
}
