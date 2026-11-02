import Link from "next/link";

/** Símbolo original exportado de Figma; conserva su geometría de 124 × 124. */
export function Brand({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className={`cutkind-brand${compact ? " compact" : ""}`} aria-label="Cutkind, inicio">
      <span className="cutkind-symbol" aria-hidden="true"><img src="/brand/cutkind-symbol.svg" width={124} height={124} alt="" /></span>
      <span className="cutkind-wordmark">cutkind</span>
    </Link>
  );
}
