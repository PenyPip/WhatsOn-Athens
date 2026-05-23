import type { DehydratedState } from "@tanstack/react-query";
import { serializeJsonForScript } from "@/lib/serializeJsonScript";

type RqBootstrapScriptProps = {
  state: DehydratedState;
};

/** React Query state εκτός RSC flight props — μικρότερο main-thread parse στο hydration. */
export default function RqBootstrapScript({ state }: RqBootstrapScriptProps) {
  return (
    <script
      id="__RQ_STATE__"
      type="application/json"
      dangerouslySetInnerHTML={{ __html: serializeJsonForScript(state) }}
    />
  );
}
