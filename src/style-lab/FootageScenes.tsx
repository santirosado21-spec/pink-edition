import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Footage, Reveal, SceneLabel, clamp} from './primitives';
import {media, sans, script, type StyleLabProps} from './theme';

export const CalloutScene: React.FC<StyleLabProps> = ({accent, monochrome}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const vertical = height > width;
  return <AbsoluteFill style={{fontFamily: sans, color: '#fff'}}>
    <Footage src={media.dawn} monochrome={monochrome} dim={0.43} />
    <SceneLabel number="04">Dirigir la mirada</SceneLabel>
    <div style={{position: 'absolute', left: '12%', top: '24%', width: vertical ? '50%' : '27%', height: vertical ? '25%' : '45%', border: '3px solid #f2f0e8', opacity: interpolate(frame, [0, 0.35 * fps], [0, 1], clamp), clipPath: `inset(0 ${interpolate(frame, [0, 0.6 * fps], [100, 0], clamp)}% 0 0)`}}>
      <div style={{position: 'absolute', bottom: 25, left: -20, padding: '12px 32px', background: accent, color: '#fff', fontSize: 29}}>Un detalle.</div>
    </div>
    <div style={{position: 'absolute', right: '10%', left: vertical ? '10%' : '50%', top: vertical ? '61%' : '35%'}}>
      <Reveal delay={0.35} style={{fontSize: 47}}>Otra forma de</Reveal>
      <Reveal delay={0.65} style={{fontFamily: script, fontSize: vertical ? 185 : 210, lineHeight: 1}}>verlo.</Reveal>
    </div>
  </AbsoluteFill>;
};

export const MosaicScene: React.FC<StyleLabProps> = ({monochrome}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const vertical = height > width;
  const sources = [media.light, media.tracking, media.dawn, media.dawn, media.light, media.tracking, media.tracking, media.dawn, media.light];
  return <AbsoluteFill style={{background: '#101410', fontFamily: sans, color: '#fff'}}>
    <div style={{position: 'absolute', inset: '-3%', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)', gap: 12, scale: interpolate(frame, [0, 4 * fps], [1.04, 1], clamp)}}>
      {sources.map((src, i) => <div key={i} style={{position: 'relative', overflow: 'hidden', opacity: interpolate(frame, [i * 0.045 * fps, (i * 0.045 + 0.4) * fps], [0, 1], clamp)}}><Footage src={src} monochrome={monochrome} dim={0.52} offset={i % 3} /></div>)}
    </div>
    <SceneLabel number="05">Conectar las piezas</SceneLabel>
    <div style={{position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', flexDirection: 'column', textAlign: 'center', padding: '8%'}}>
      <Reveal delay={0.3} style={{fontSize: 44}}>Distintas miradas.</Reveal>
      <Reveal delay={0.6} style={{fontSize: vertical ? 116 : 175, lineHeight: 1.06, fontStyle: 'italic', letterSpacing: -7}}>Una misma<br/>historia.</Reveal>
    </div>
  </AbsoluteFill>;
};
