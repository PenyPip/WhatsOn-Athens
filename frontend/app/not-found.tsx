import SpaRoot from "./SpaShell";

/** Ελαφρύ fallback — χωρίς prefetch (αποφεύγει διπλό compile σε error paths). */
export default function NotFound() {
  return <SpaRoot ssrPath="/" />;
}
