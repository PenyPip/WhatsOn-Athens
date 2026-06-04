"use client";

import { createContext, useContext } from "react";

/** True όταν το server HTML έχει ήδη #home-static-lcp (αποφυγή διπλού shell στο SSR). */
export const HomeStaticLcpContext = createContext(false);

export function useHomeStaticLcpOnPage(): boolean {
  return useContext(HomeStaticLcpContext);
}
