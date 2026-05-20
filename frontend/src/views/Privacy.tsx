"use client";

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  clearCookieConsent,
  COOKIE_BANNER_OPEN_EVENT,
} from "@/lib/cookieConsent";
import { usePageSeo } from "@/hooks/usePageSeo";
import { staticPageSeo } from "@/lib/pageSeoCopy";

const LAST_UPDATED = "Μάιος 2026";

function openCookieBannerAgain() {
  clearCookieConsent();
  window.dispatchEvent(new CustomEvent(COOKIE_BANNER_OPEN_EVENT));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/**
 * Πρότυπο νομικών κειμένων — συμπλήρωσε στοιχεία εταιρείας / DPO / email επικοινωνίας πριν από production.
 */
const Privacy = () => {
  usePageSeo(staticPageSeo.privacy);

  return (
    <div className="min-h-screen pt-36 pb-20 md:pb-8">
      <div className="section-black py-10 -mt-28 pt-36 mb-8 md:pt-36">
        <div className="container max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <p className="text-xs uppercase tracking-[0.2em] text-amber-200/80 mb-2">Νομικά</p>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">Απόρρητο & cookies</h1>
            <p className="text-white/45 text-sm">Τελευταία ενημέρωση: {LAST_UPDATED}</p>
          </motion.div>
        </div>
      </div>

      <article className="container max-w-3xl pb-16 prose prose-invert prose-sm md:prose-base max-w-none prose-headings:font-display prose-p:text-white/75 prose-li:text-white/75 prose-strong:text-white/90 prose-a:text-amber-200 hover:prose-a:text-amber-100">
        <section id="eisagogi" className="scroll-mt-28">
          <h2>1. Εισαγωγή</h2>
          <p>
            Το <strong>37°N</strong> (εφεξής «ιστότοπος») σέβεται το απόρρητό σου. Η παρούσα ενημέρωση περιγράφει πώς
            συλλέγουμε και επεξεργαζόμαστε προσωπικά δεδομένα όταν επισκέπτεσαι τον ιστότοπο, σύμφωνα με τον Γενικό Κανονισμό
            Προστασίας Δεδομένων (ΕΕ 2016/679, GDPR) και την ελληνική νομοθεσία.
          </p>
        </section>

        <section id="ypeuthynos" className="scroll-mt-28">
          <h2>2. Υπεύθυνος επεξεργασίας</h2>
          <p>
            Υπεύθυνος επεξεργασίας:{" "}
            <strong>[συμπλήρωσε επωνυμία, ΑΦΜ, έδρα]</strong>.
            <br />
            Ε-mail επικοινωνίας για θέματα απορρήτου:{" "}
            <a href="mailto:privacy@example.com">privacy@example.com</a>{" "}
            <span className="text-white/45">(αντικατέστησε με πραγματική διεύθυνση)</span>.
          </p>
        </section>

        <section id="dedomena" className="scroll-mt-28">
          <h2>3. Ποια δεδομένα επεξεργαζόμαστε</h2>
          <ul>
            <li>
              <strong>Τεχνικά & περιήγηση:</strong> όταν φορτώνεις τις σελίδες, ο server ή/και το CDN ενδέχεται να καταγράφουν
              διεύθυνση IP, τύπο browser/συσκευής, ημερομηνία/ώρα αιτήματος για ασφάλεια και λειτουργικότητα.
            </li>
            <li>
              <strong>Συγκαίνεση cookies:</strong> αποθηκεύουμε την επιλογή σου (απαραίτητα / όλα) στο πρόγραμμα περιήγησης.
            </li>
            <li>
              <strong>Περιεχόμενο εκδηλώσεων:</strong> ο ιστότοπος εμφανίζει δημόσιες πληροφορίες ταινιών, χώρων κ.λπ. από το
              σύστημα διαχείρισης περιεχομένου — δεν δημοσιεύουμε τα δικά σου στοιχεία επικοινωνίας χωρίς να τα έχεις υποβάλει
              εσύ (π.χ. φόρμα στο μέλλον).
            </li>
          </ul>
        </section>

        <section id="skopos" className="scroll-mt-28">
          <h2>4. Σκοπός & νομική βάση</h2>
          <ul>
            <li>
              <strong>Λειτουργία ιστοτόπου</strong> (άρθρο 6 §1 β GDPR — εκτέλεση σύμβασης / έννομο συμφέρον για ασφαλή
              παροχή υπηρεσίας).
            </li>
            <li>
              <strong>Cookies μη απαραίτητα</strong> (π.χ. στατιστικά): μόνο μετά από συγκαίνεση (άρθρο 6 §1 α GDPR).
            </li>
          </ul>
        </section>

        <section id="cookies" className="scroll-mt-28">
          <h2>5. Cookies</h2>
          <p>
            Χρησιμοποιούμε cookies και παρόμοιες τεχνολογίες. Μπορείς να επιλέξεις «Μόνο απαραίτητα» ή «Αποδοχή όλων» μέσω
            του banner· η επιλογή αποθηκεύεται ως <code className="text-amber-200/90">whatson_cc</code> (τοπικά στον browser).
          </p>
          <div className="not-prose my-6 overflow-x-auto rounded-lg border border-white/10 text-sm">
            <table className="w-full border-collapse text-left font-body">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-white/90">
                  <th className="px-3 py-2 font-medium">Όνομα</th>
                  <th className="px-3 py-2 font-medium">Σκοπός</th>
                  <th className="px-3 py-2 font-medium">Διάρκεια</th>
                </tr>
              </thead>
              <tbody className="text-white/70">
                <tr className="border-b border-white/[0.07]">
                  <td className="px-3 py-2">whatson_cc</td>
                  <td className="px-3 py-2">Απομνημόνευση επιλογής συναίνεσης cookies</td>
                  <td className="px-3 py-2">Έως 12 μήνες</td>
                </tr>
                <tr className="border-b border-white/[0.07]">
                  <td className="px-3 py-2">Προαιρετικά (μελλοντικά)</td>
                  <td className="px-3 py-2">Στατιστική επισκεψιμότητας — μόνο αν δώσεις συγκαίνεση «Όλα»</td>
                  <td className="px-3 py-2">Σύμφωνα με πάροχο</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="not-prose rounded-xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
            <p className="text-sm text-white/80 font-body m-0 mb-3">
              Θες να αλλάξεις επιλογή; Θα διαγράψουμε την αποθηκευμένη συγκαίνεση και θα εμφανιστεί ξανά το κάτω banner.
            </p>
            <Button
              type="button"
              variant="outline"
              className="border-amber-500/40 text-amber-100 hover:bg-amber-500/10"
              onClick={openCookieBannerAgain}
            >
              Άνοιξε ξανά τις προτιμήσεις cookies
            </Button>
          </div>
        </section>

        <section id="metafora" className="scroll-mt-28">
          <h2>6. Διάρκεια & κοινοποίηση</h2>
          <p>
            Τα cookies συναίνεσης τηρούνται για περιορισμένο χρόνο όπως παραπάνω. Δεν πωλούμε τα προσωπικά σου δεδομένα. Τα
            δεδομένα ενδέχεται να επεξεργάζονται τεχνικοί πάροχοι (hosting, CDN) ως εκτελούντες την επεξεργασία, σύμφωνα με
            συμβάσεις και τις οδηγίες μας.
          </p>
        </section>

        <section id="dikaiomata" className="scroll-mt-28">
          <h2>7. Δικαιώματα υποκειμένου</h2>
          <p>Έχεις δικαίωμα πρόσβασης, διόρθωσης, διαγραφής, περιορισμού, εναντίωσης και φορητότητας, καθώς και υποβολής
            καταγγελίας στην Αρχή Προστασίας Δεδομένων Προσωπικού Χαρακτήρα (<a href="https://www.dpa.gr" target="_blank" rel="noopener noreferrer">dpa.gr</a>).
          </p>
        </section>

        <section id="oroi" className="scroll-mt-28">
          <h2>8. Όροι χρήσης (συνοπτικά)</h2>
          <p>
            Ο ιστότοπος παρέχεται «ως έχει». Το περιεχόμενα (πρόγραμμα, κριτικές, κ.λπ.) ενδέχεται να αλλάζει. Η χρήση για
            παράνομο σκοπό απαγορεύεται. Δεν ευθυνόμαστε για εξωτερικούς συνδέσμους· οι τρίτοι όροι ισχύουν για τις δικές τους
            υπηρεσίες.
          </p>
          <p className="text-white/50 text-sm">
            Για λεπτομερείς εμπορικούς/dιευθυντικούς όρους, συμπλήρωσε κείμενο με νομικό σύμβουλο αν χρειάζεται B2B ή
            συνδρομές.
          </p>
        </section>

        <p className="pt-8 text-sm text-white/45 not-prose">
          <Link to="/" className="text-amber-200/90 hover:text-amber-100">
            ← Επιστροφή στην αρχική
          </Link>
        </p>
      </article>

      <Footer />
    </div>
  );
};

export default Privacy;
