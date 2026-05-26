import dynamic from "next/dynamic";
import RqBootstrapScript from "@/components/RqBootstrapScript";
import { prefetchRouteData } from "@/lib/ssrPrefetch";
import { serializeDehydratedState } from "@/lib/serializeDehydratedState";

const SpaRoot = dynamic(() => import("./SpaShell"), { ssr: true });

/**
 * Fallback SPA για dev· σε production το nginx σερβίρει το pre-rendered HTML ανά path.
 */
export default async function NotFound() {
  const dehydratedState = await prefetchRouteData("/");
  return (
    <>
      <RqBootstrapScript state={dehydratedState} />
      <SpaRoot ssrPath="/" bootstrapJson={serializeDehydratedState(dehydratedState)} />
    </>
  );
}
