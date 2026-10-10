"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Aparece con un desvanecido al llegar a la vista; sin JavaScript o con movimiento reducido se ve siempre.
export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const element = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"visible" | "armed" | "in">("visible");

  useEffect(() => {
    const node = element.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (node.getBoundingClientRect().top < window.innerHeight) return;
    setState("armed");
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setState("in"); observer.disconnect(); } }, { threshold: 0.12 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return <div ref={element} className={`reveal ${state} ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}
