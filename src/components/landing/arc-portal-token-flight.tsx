"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArcToken3d } from "@/components/landing/arc-token-3d";
import type { CryptoId } from "@/components/landing/arc-crypto-icons";

const ORBIT_R = 132;
const CYCLE = 5.2;

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

  const half = 32;

  return (
    <motion.div
      className="arc-portal-token-wrap"
      data-token={id}
      initial={false}
      animate={{
        x: [ox - half, (ox - half) * 0.18, -half, -half, (ox - half) * 0.18, ox - half],
        y: [oy - half, (oy - half) * 0.18, -half, -half, (oy - half) * 0.18, oy - half],
        scale: [1, 0.92, 0.08, 0.08, 0.92, 1],
        rotateY: [0, 200, 480, 480, 700, 900],
        rotateX: [12, 28, 50, 50, 18, 12],
        opacity: [1, 1, 1, 0, 1, 1],
        z: [0, 40, 80, 80, 40, 0],
      }}
      transition={{
        duration: CYCLE,
        delay,
        repeat: Infinity,
        times: [0, 0.12, 0.4, 0.5, 0.58, 0.92, 1],
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
