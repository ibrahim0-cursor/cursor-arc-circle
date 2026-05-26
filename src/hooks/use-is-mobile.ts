"use client";

import { useEffect, useState } from "react";

/** Matches Tailwind `lg` — phone & tablet portrait easy mode */
export function useIsMobile(breakpointPx = 1024) {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpointPx]);

  return mobile;
}
