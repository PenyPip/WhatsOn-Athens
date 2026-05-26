import type { DehydratedState } from "@tanstack/react-query";
import { serializeDehydratedState } from "@/lib/serializeDehydratedState";

/** Inline bootstrap για React Query — αποφεύγει τεράστιο RSC object prop. */
export default function RqBootstrapScript({ state }: { state: DehydratedState }) {
  return (
    <script
      id="__RQ_STATE__"
      type="application/json"
      dangerouslySetInnerHTML={{ __html: serializeDehydratedState(state) }}
    />
  );
}
