import SpaRoot from "@/components/SpaRoot";

/**
 * Catch-all για το dev server και το static export:
 * οποιοδήποτε URL δεν αντιστοιχεί σε Next page (π.χ. /movies/foo)
 * φορτώνει το React Router SPA που χειρίζεται την πλοήγηση client-side.
 *
 * Σε production το nginx (`try_files … /index.html`) κάνει το ίδιο
 * χωρίς να χρειαστεί ποτέ να σερβιριστεί το 404.html.
 */
export default function NotFound() {
  return <SpaRoot />;
}
