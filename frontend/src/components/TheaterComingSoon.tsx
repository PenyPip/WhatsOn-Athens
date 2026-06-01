import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type TheaterComingSoonProps = {
  /** Πλήρης σελίδα `/theater` ή ενότητα στην αρχική */
  variant?: "page" | "section";
  className?: string;
};

function StageIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 52V28c0-8 8-14 20-14s20 6 20 14v24"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M8 52h48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="22" cy="30" rx="4" ry="5" fill="currentColor" opacity="0.9" />
      <ellipse cx="42" cy="30" rx="4" ry="5" fill="currentColor" opacity="0.9" />
      <path
        d="M18 38c2 3 6 5 14 5s12-2 14-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M32 14v6M26 12l6 4M38 12l-6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

export default function TheaterComingSoon({ variant = "page", className }: TheaterComingSoonProps) {
  const isPage = variant === "page";

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        isPage ? "mx-auto max-w-3xl" : "mt-10",
        className,
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-white/10",
          isPage ? "px-6 py-14 md:px-12 md:py-16" : "px-5 py-10 md:px-8 md:py-12",
        )}
        style={{
          background:
            "linear-gradient(145deg, rgba(124,43,118,0.35) 0%, rgba(19,20,62,0.95) 42%, rgba(13,12,36,1) 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute -left-16 top-0 h-40 w-40 rounded-full bg-amber-400/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-12 bottom-0 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#13143E] to-transparent opacity-80"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#13143E] to-transparent opacity-80"
          aria-hidden
        />

        <div className="relative z-[1] flex flex-col items-center text-center">
          <span className="mb-5 inline-flex items-center rounded-full border border-amber-300/50 bg-amber-400/15 px-4 py-2 font-body text-[11px] font-bold uppercase tracking-[0.24em] text-amber-50 shadow-[0_0_32px_rgba(251,191,36,0.15)]">
            Coming soon
          </span>

          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-amber-200/90 shadow-inner">
            <StageIcon className="h-11 w-11" />
          </div>

          <h2
            className={cn(
              "font-display font-bold leading-tight text-white",
              isPage ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl",
            )}
          >
            Το θέατρο έρχεται στο 37°N
          </h2>
          <p
            className={cn(
              "mt-4 max-w-md font-body leading-relaxed text-white",
              isPage ? "text-base md:text-lg" : "text-sm md:text-base",
            )}
          >
            Ετοιμάζουμε παραστάσεις, περιοδείες και χώρους — με πρόγραμμα, αφίσες και όλες τις πληροφορίες που
            χρειάζεσαι για να κλείσεις την επόμενη έξοδο.
          </p>

          <ul className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 font-body text-xs font-medium uppercase tracking-[0.16em] text-white md:text-[13px]">
            <li>Περιοδείες</li>
            <li aria-hidden className="text-white/50">
              ·
            </li>
            <li>Αθήνα & Θεσσαλονίκη</li>
            <li aria-hidden className="text-white/50">
              ·
            </li>
            <li>Πρόγραμμα & εισιτήρια</li>
          </ul>

          {isPage ? (
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/movies"
                className="inline-flex items-center rounded bg-white px-6 py-3 text-sm font-semibold text-[#13143E] transition-colors hover:bg-white/90"
              >
                Δες ταινίες τώρα
              </Link>
              <Link
                to="/"
                className="inline-flex items-center rounded border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15"
              >
                Αρχική
              </Link>
            </div>
          ) : (
            <Link
              to="/theater"
              className="mt-8 inline-flex items-center gap-1 text-sm font-semibold text-amber-200/95 transition-colors hover:text-amber-50"
            >
              Η σελίδα θεάτρου
              <span aria-hidden>→</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
