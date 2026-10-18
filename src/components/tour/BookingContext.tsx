"use client";
import { createContext, useContext, useState } from "react";

export type Dep = { id: number; date: string; adult: number; child: number; infant: number; left: number };
type State = { depId: number | null; setDepId: (id: number) => void; adults: number; children: number; infants: number; setGuests: (k: "adults" | "children" | "infants", v: number) => void };

const Ctx = createContext<State | null>(null);

export function BookingProvider({ children, initialDep }: { children: React.ReactNode; initialDep: number | null }) {
  const [depId, setDepId] = useState<number | null>(initialDep);
  const [g, setG] = useState({ adults: 2, children: 0, infants: 0 });
  return (
    <Ctx.Provider value={{ depId, setDepId, ...g, setGuests: (k, v) => setG((x) => ({ ...x, [k]: v })) }}>
      {children}
    </Ctx.Provider>
  );
}

export const useBooking = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("BookingProvider missing");
  return c;
};
