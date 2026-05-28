import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  BadgeCheck,
  CircleArrowDown,
  CircleArrowUp,
  Cpu,
  Landmark,
  LineChart,
  MessageCircle,
  PieChart,
  Repeat2,
  WalletCards,
} from "lucide-react";

/** Shared NEXUS trade / wallet iconography (homepage-aligned) */
export const NEXUS_TRADE_ICONS = {
  buy: CircleArrowUp,
  sell: CircleArrowDown,
  autopilot: Cpu,
  confirmBuy: BadgeCheck,
  confirmSell: BadgeCheck,
  wallet: WalletCards,
  portfolio: PieChart,
  swap: ArrowLeftRight,
  trade: Repeat2,
  chart: LineChart,
  holdings: Landmark,
  chat: MessageCircle,
} as const satisfies Record<string, LucideIcon>;

export type NexusTradeIconKey = keyof typeof NEXUS_TRADE_ICONS;
