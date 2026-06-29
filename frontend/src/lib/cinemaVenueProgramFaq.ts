export type FaqEntry = { question: string; answer: string };

/** FAQ copy για πρόγραμμα σινεμά — κοινό UI + JSON-LD. */
export function cinemaVenueFaqEntries(
  venueName: string,
  opts?: { hasBookingLink?: boolean; address?: string | null },
): FaqEntry[] {
  const name = venueName.trim() || "το σινεμά";
  const addr = opts?.address?.trim();
  const entries: FaqEntry[] = [
    {
      question: `Ποιες ταινίες παίζουν στο ${name} σήμερα;`,
      answer: `Στη σελίδα αυτή βλέπεις όλες τις ταινίες και τις ώρες προβολών στο ${name} — ενημερωμένο πρόγραμμα με αφίσες και ημερολόγιο εβδομάδας κινηματογράφου.`,
    },
    {
      question: `Πού βρίσκεται ${addr ? `το ${name}` : name};`,
      answer: addr
        ? `Η διεύθυνση είναι ${addr}. Μπορείς να ανοίξεις τον χάρτη από τη σελίδα για οδηγίες πρόσβασης.`
        : `Η τοποθεσία του χώρου εμφανίζεται στην κεφαλίδα της σελίδας — δες τη διεύθυνση και τον σύνδεσμο χάρτη.`,
    },
  ];
  if (opts?.hasBookingLink) {
    entries.push({
      question: `Πώς κάνω κράτηση εισιτηρίων στο ${name};`,
      answer: `Πάτησε «Κράτηση / εισιτήρια» για να μεταβείς στο More.com και να ολοκληρώσεις την κράτηση online.`,
    });
  } else {
    entries.push({
      question: `Πώς βρίσκω ώρες και εισιτήρια για ${name};`,
      answer: `Δες το εβδομαδιαίο πρόγραμμα παρακάτω — κάθε ταινία συνδέεται με σελίδα λεπτομέρειας όπου υπάρχουν όλες οι προβολές και σύνδεσμοι κράτησης όπου διατίθενται.`,
    });
  }
  return entries;
}
