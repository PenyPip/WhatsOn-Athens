import { Link } from "react-router-dom";
import { SHOW_PROFILE_IN_NAV } from "@/lib/siteVisibility";

const Footer = () => {
  return (
    <footer className="section-black py-12 mt-16 border-t border-white/10">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <span className="font-display text-xl font-bold text-white">37°N</span>
            <span className="text-white/30 text-xs ml-2 uppercase tracking-widest">Athens</span>
            <p className="text-white/40 text-xs mt-3 leading-relaxed">Ο οδηγός σου για ψυχαγωγία και γαστρονομία στην Αθήνα.</p>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-[0.15em] text-white/50 mb-3">Εξερεύνηση</h4>
            <div className="space-y-2 text-sm">
              <a href="/movies" className="block text-white/60 hover:text-white transition-colors">Ταινίες</a>
              <a href="/theater" className="block text-white/60 hover:text-white transition-colors">Θέατρο</a>
              <a href="/dining" className="block text-white/60 hover:text-white transition-colors">Φαγητό</a>
            </div>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-[0.15em] text-white/50 mb-3">Περιεχόμενο</h4>
            <div className="space-y-2 text-sm">
              <a href="/venues" className="block text-white/60 hover:text-white transition-colors">
                Χώροι
              </a>
              {SHOW_PROFILE_IN_NAV ? (
                <a href="/profile" className="block text-white/60 hover:text-white transition-colors">
                  Προφίλ
                </a>
              ) : null}
            </div>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-[0.15em] text-white/50 mb-3">Νομικά & social</h4>
            <div className="space-y-2 text-sm">
              <Link to="/privacy" className="block text-white/60 hover:text-white transition-colors">
                Απόρρητο & cookies
              </Link>
              <a href="/privacy#oroi" className="block text-white/60 hover:text-white transition-colors">
                Όροι χρήσης
              </a>
              <span className="block text-white/60">Instagram</span>
              <span className="block text-white/60">Facebook</span>
              <span className="block text-white/60">Twitter</span>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 pt-6 flex flex-col items-center gap-2 md:flex-row md:justify-between md:gap-4 text-center md:text-left">
          <p className="text-xs text-white/30">© 2026 37°N Athens. Με ❤️ από την Αθήνα.</p>
          <p className="text-xs text-white/25 font-body">
            <Link to="/privacy" className="text-white/40 hover:text-white/60 transition-colors">
              Πολιτική απορρήτου
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
