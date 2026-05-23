import SpaRoot from "@/components/SpaRoot";
import { prefetchRouteData } from "@/lib/ssrPrefetch";

/**
 * Fallback SPA για dev· σε production το nginx σερβίρει το pre-rendered HTML ανά path.
 */
export default async function NotFound() {
  const dehydratedState = await prefetchRouteData("/");
  return <SpaRoot ssrPath="/" dehydratedState={dehydratedState} />;
}
