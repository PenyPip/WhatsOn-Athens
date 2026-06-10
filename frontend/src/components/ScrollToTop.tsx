import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Μετά από <Link> το React Router δεν γυρίζει το παράθυρο στην κορυφή· μένει το scroll της προηγούμενης σελίδας ή του index. */
const ScrollToTop = () => {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = hash.replace(/^#/, "");
      if (!id) return;
      const scrollToHash = () => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "auto", block: "start" });
          return true;
        }
        return false;
      };
      if (!scrollToHash()) {
        const timer = window.setTimeout(scrollToHash, 120);
        return () => window.clearTimeout(timer);
      }
      return undefined;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    return undefined;
  }, [pathname, search, hash]);

  return null;
};

export default ScrollToTop;
