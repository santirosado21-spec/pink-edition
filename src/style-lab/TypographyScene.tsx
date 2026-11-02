import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Footage, Reveal, SceneLabel, clamp} from './primitives';
import {media, sans, script, type StyleLabProps} from './theme';

export const OpeningScene: React.FC<StyleLabProps> = ({monochrome}) => {
  const {width, height} = useVideoConfig();
  const vertical = height > width;
  return <AbsoluteFill style={{color: '#f9f6ed', fontFamily: sans}}>
    <Footage src={media.light} monochrome={monochrome} dim={0.42} />
    <SceneLabel number="01">Una mirada</SceneLabel>
    <div style={{position: 'absolute', left: '9%', right: '9%', top: vertical ? '35%' : '31%'}}>
      <Reveal style={{fontSize: vertical ? 62 : 57, letterSpacing: -2}}>Todo empieza</Reveal>
      <Reveal delay={0.35} style={{fontFamily: script, fontSize: vertical ? 165 : 210, lineHeight: 1.05}}>con una mirada.</Reveal>
    </div>
    <div style={{position: 'absolute', bottom: '7%', left: '9%', fontSize: 23, letterSpacing: 4}}>LUZ · MOVIMIENTO · INTENCIÓN</div>
  </AbsoluteFill>;
};

export const EmphasisScene: React.FC<StyleLabProps> = ({accent, monochrome}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  return <AbsoluteFill style={{fontFamily: sans, color: '#fff', justifyContent: 'center', alignItems: 'center'}}>
    <Footage src={media.tracking} monochrome={monochrome} dim={0.66} />
    <SceneLabel number="02">Énfasis</SceneLabel>
    <div style={{zIndex: 1, textAlign: 'center', maxWidth: '86%'}}>
      <Reveal style={{fontSize: 48, letterSpacing: -1}}>La luz cambia</Reveal>
      <Reveal delay={0.45} style={{fontSize: height > width ? 130 : 190, lineHeight: 1.1, letterSpacing: -8, fontStyle: 'italic', filter: `blur(${interpolate(frame, [0.45 * fps, 0.8 * fps], [12, 0], clamp)}px)`}}>la historia.</Reveal>
      <div style={{height: 5, background: accent, margin: '30px auto', width: interpolate(frame, [0.9 * fps, 1.4 * fps], [0, width * 0.22], clamp)}} />
    </div>
  </AbsoluteFill>;
};

export const ClosingScene: React.FC<StyleLabProps> = ({accent}) => {
  const {width, height} = useVideoConfig();
  const vertical = height > width;
  return <AbsoluteFill style={{background: '#f2f0e8', color: '#171b18', fontFamily: sans, justifyContent: 'center', alignItems: 'center'}}>
    <SceneLabel number="06" dark>Tu estilo</SceneLabel>
    <div style={{textAlign: 'center', width: '86%'}}>
      <Reveal style={{fontSize: vertical ? 57 : 68, letterSpacing: -3}}>Una historia.</Reveal>
      <Reveal delay={0.25} style={{fontFamily: script, color: accent, fontSize: vertical ? 190 : 225, lineHeight: 1.08}}>Tu forma</Reveal>
      <Reveal delay={0.55} style={{fontSize: vertical ? 90 : 110, letterSpacing: -5}}>de contarla.</Reveal>
    </div>
    <div style={{position: 'absolute', bottom: '7%', fontSize: 22, letterSpacing: 4}}>ESTUDIO DE ESTILO / 001</div>
  </AbsoluteFill>;
};
