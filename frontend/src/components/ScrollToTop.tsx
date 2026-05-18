import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

/** Μετά από <Link> το React Router δεν γυρίζει το παράθυρο στην κορυφή· μένει το scroll της προηγούμενης σελίδας ή του index. */
const ScrollToTop = () => {
  const { pathname, search } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, search]);

  return null;
};

export default ScrollToTop;
