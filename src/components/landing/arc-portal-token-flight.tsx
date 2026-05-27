"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArcToken3d } from "@/components/landing/arc-token-3d";
import type { CryptoId } from "@/components/landing/arc-crypto-icons";

const ORBIT_R = 168;
const CYCLE = 5.8;

type Props = {
  id: CryptoId;
  angleDeg: number;
  delay: number;
};

/**
 * Cinematic arc: orbit → dive into portal → AI beat → emerge enhanced → orbit.
 */
export function ArcPortalTokenFlight({ id, angleDeg, delay }: Props) {
  const reduced = useReducedMotion();
  const rad = (angleDeg * Math.PI) / 180;
  const ox = Math.cos(rad) * ORBIT_R;
  const oy = Math.sin(rad) * ORBIT_R;

  if (reduced) {
    return (
      <div
        className="arc-portal-token-wrap"
        style={{ transform: `translate(calc(-50% + ${ox}px), calc(-50% + ${oy}px))` }}
      >
        <ArcToken3d id={id} size="lg" />
      </div>
    );
  }

  const half = 28;

  return (
    <motion.div
      className="arc-portal-token-wrap"
      data-token={id}
      initial={false}
      animate={{
        x: [ox - half, (ox - half) * 0.22, -half, -half, (ox - half) * 0.22, ox - half],
        y: [oy - half, (oy - half) * 0.22, -half, -half, (oy - half) * 0.22, oy - half],
        scale: [1, 0.9, 0.05, 0.05, 0.9, 1],
        rotateY: [0, 220, 520, 520, 760, 980],
        rotateX: [14, 32, 58, 58, 20, 14],
        opacity: [0, 1, 1, 0, 1, 0],
        z: [0, 48, 96, 96, 48, 0],
      }}
      transition={{
        duration: CYCLE,
        delay,
        repeat: Infinity,
        times: [0, 0.1, 0.44, 0.52, 0.6, 0.94, 1],
        ease: [
          [0.16, 1, 0.3, 1],
          [0.55, 0.06, 0.68, 0.53],
          [0.4, 0, 1, 1],
          "linear",
          [0.22, 1, 0.36, 1],
          [0.16, 1, 0.3, 1],
        ],
      }}
    >
      <ArcToken3d id={id} size="lg" />
    </motion.div>
  );
}
