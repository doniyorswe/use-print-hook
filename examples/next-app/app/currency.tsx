'use client';

import { createContext, useContext, type ReactNode } from 'react';

const CurrencyContext = createContext('USD');

export function CurrencyProvider({ children }: { children?: ReactNode }) {
  return <CurrencyContext.Provider value="UZS">{children}</CurrencyContext.Provider>;
}

export function useMoney() {
  const currency = useContext(CurrencyContext);
  return (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
}
