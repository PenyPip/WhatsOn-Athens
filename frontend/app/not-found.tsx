import type { Metadata } from "next";
import Link from "next/link";
import { formatPageTitle } from "@/lib/siteMetadata";
import { staticPageSeo } from "@/lib/pageSeoCopy";

export const metadata: Metadata = {
  title: formatPageTitle(staticPageSeo.notFound.title),
  description: staticPageSeo.notFound.description,
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[65vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
      <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">404</p>
      <h1 className="mb-3 text-3xl font-bold">Η σελίδα δεν βρέθηκε</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Το URL δεν αντιστοιχεί σε διαθέσιμο περιεχόμενο.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="rounded bg-[#13143E] px-4 py-2 text-sm font-semibold text-white">
          Αρχική
        </Link>
        <Link href="/movies" className="rounded border px-4 py-2 text-sm font-semibold">
          Ταινίες
        </Link>
      </div>
    </main>
  );
}
