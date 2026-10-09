import type { ReactNode } from "react";
import { getPrimaryAction, landingConfig } from "./config";

export function Badge({ children }: { children: ReactNode }) {
  return <span className="status-label">{children}</span>;
}
export function PrimaryAction() {
  const action = getPrimaryAction(landingConfig);
  return (
    <a className="primary-cta" href={action.href}>
      {action.label}
      <span aria-hidden="true">↗</span>
    </a>
  );
}
export function SectionHeading({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <p className="eyebrow">{number} / PINK.AI</p>
      <h2>{title}</h2>
      {children && <p className="section-lead">{children}</p>}
    </div>
  );
}
export function Brand() {
  return (
    <a className="brand-link" href="/" aria-label="Pink.ai, inicio">
      <img src="/logo.png" width="48" height="48" alt="" />
      <span>
        Pink.ai<span className="brand-dot">●</span>
      </span>
    </a>
  );
}
