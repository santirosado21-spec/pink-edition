import { getPrimaryAction, landingConfig } from "./config";

export function PrimaryAction({ light = false }: { light?: boolean }) {
  const action = getPrimaryAction(landingConfig);
  return <a className={`cta${light ? " light" : ""}`} href={action.href}>{action.label}<span aria-hidden="true">→</span></a>;
}

export function Brand() {
  return (
    <a className="brand-link" href="/" aria-label="Pink.ai, inicio">
      <img src="/logo.png" width="40" height="40" alt="" />
      <span>Pink<i>.ai</i></span>
    </a>
  );
}

export function Heading({ eyebrow, children, sub, center = true }: { eyebrow?: string; children: React.ReactNode; sub?: React.ReactNode; center?: boolean }) {
  return (
    <div className={`heading${center ? " center" : ""}`}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2>{children}</h2>
      {sub && <p className="sub">{sub}</p>}
    </div>
  );
}
