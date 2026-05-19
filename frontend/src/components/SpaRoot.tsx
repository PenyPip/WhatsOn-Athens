"use client";

import dynamic from "next/dynamic";

const App = dynamic(() => import("@/App"), { ssr: false });

/** Client boundary για το React Router app — δυναμικό import ώστε το static export να μην κάνει SSR στο Router. */
export default function SpaRoot() {
  return <App />;
}
