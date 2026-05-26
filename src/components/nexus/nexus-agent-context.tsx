"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AutopilotLog } from "@/lib/nexus-autopilot";

export type NexusAgentRuntime = {
  enabled: boolean;
  nextIn: number;
  running: boolean;
  logs: AutopilotLog[];
  lastReasoning: string | null;
  displaySymbol: string;
  stop: () => void;
  runNow: () => void;
};

const defaultRuntime: NexusAgentRuntime = {
  enabled: false,
  nextIn: 0,
  running: false,
  logs: [],
  lastReasoning: null,
  displaySymbol: "—",
  stop: () => {},
  runNow: () => {},
};

const NexusAgentContext = createContext<NexusAgentRuntime>(defaultRuntime);

export function NexusAgentProvider({
  value,
  children,
}: {
  value: NexusAgentRuntime;
  children: ReactNode;
}) {
  return <NexusAgentContext.Provider value={value}>{children}</NexusAgentContext.Provider>;
}

export function useNexusAgentRuntime() {
  return useContext(NexusAgentContext);
}
