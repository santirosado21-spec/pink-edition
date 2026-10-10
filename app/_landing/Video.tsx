// Video real del producto, con controles. Sin autoplay salvo en el hero (mudo).
export function Video({ src, poster, label, autoPlay = false }: { src: string; poster?: string; label?: string; autoPlay?: boolean }) {
  return (
    <div className="video-frame">
      <video src={src} poster={poster} controls playsInline preload="metadata" muted={autoPlay} loop={autoPlay} autoPlay={autoPlay} aria-label={label} />
      {label && <span className="video-tag">{label}</span>}
    </div>
  );
}
