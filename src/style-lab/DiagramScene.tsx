import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Reveal, SceneLabel, clamp} from './primitives';
import {sans, type StyleLabProps} from './theme';

const Icon: React.FC<{kind: 'eye' | 'frame' | 'story'}> = ({kind}) => <svg viewBox="0 0 100 100" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
  {kind === 'eye' ? <><path d="M8 50Q50 4 92 50Q50 96 8 50Z"/><circle cx="50" cy="50" r="13"/></> : kind === 'frame' ? <><path d="M8 36V14H30M70 14H92V36M92 64V86H70M30 86H8V64"/><path d="M30 50H70M50 30V70"/></> : <><rect x="17" y="12" width="66" height="76" rx="5"/><path d="M30 34H70M30 49H70M30 64H55"/></>}
</svg>;

// One template controls all nodes; changing the labels keeps reveal timing consistent.
export const DiagramScene: React.FC<StyleLabProps> = ({accent}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const vertical = height > width;
  return <AbsoluteFill style={{background: '#f2f0e8', fontFamily: sans, color: '#20241e', overflow: 'hidden'}}>
    <div style={{position: 'absolute', inset: '-40%', background: 'repeating-linear-gradient(90deg, transparent 0 230px, #29322322 230px 270px)', filter: 'blur(23px)', rotate: '-27deg', translate: `${interpolate(frame, [0, 4 * fps], [-30, 30], clamp)}px 0`}} />
    <SceneLabel number="03" dark>Explicar con imágenes</SceneLabel>
    <Reveal style={{position: 'absolute', left: '9%', top: '17%', fontSize: vertical ? 60 : 70, letterSpacing: -3}}>De una idea a una historia.</Reveal>
    <div style={{position: 'absolute', left: '10%', right: '10%', top: vertical ? '29%' : '43%', display: 'flex', flexDirection: vertical ? 'column' : 'row', alignItems: 'center', justifyContent: 'space-between', gap: vertical ? 38 : 60}}>
      {(['Mirar', 'Elegir', 'Contar'] as const).map((label, i) => <React.Fragment key={label}>
        {i > 0 && <svg width={vertical ? 50 : 170} height={vertical ? 85 : 50} viewBox={vertical ? '0 0 50 100' : '0 0 170 50'} style={{flexShrink: 0, opacity: interpolate(frame, [(i * 0.8 - 0.2) * fps, i * 0.8 * fps], [0, 1], clamp)}}><path d={vertical ? 'M20 5Q45 48 25 90M14 75L25 91L38 76' : 'M5 35Q80 -10 158 26M144 12L160 27L139 32'} fill="none" stroke={accent} strokeWidth="3" pathLength={1} strokeDasharray={1} strokeDashoffset={interpolate(frame, [(i * 0.8 - 0.2) * fps, (i * 0.8 + 0.2) * fps], [1, 0], clamp)} /></svg>}
        <Reveal delay={i * 0.8} style={{textAlign: 'center', width: vertical ? 400 : 250, flexShrink: 0}}>
          <div style={{width: 112, height: 112, margin: '0 auto 26px'}}><Icon kind={i === 0 ? 'eye' : i === 1 ? 'frame' : 'story'} /></div>
          <div style={{fontSize: 36}}>{label}</div>
        </Reveal>
      </React.Fragment>)}
    </div>
  </AbsoluteFill>;
};
