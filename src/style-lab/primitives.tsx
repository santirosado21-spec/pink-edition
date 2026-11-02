import React from 'react';
import {Video} from '@remotion/media';
import {AbsoluteFill, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {sans} from './theme';

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const Footage: React.FC<{src: string; monochrome?: boolean; dim?: number; offset?: number}> = ({src, monochrome = false, dim = 0.25, offset = 0}) => {
  const {fps} = useVideoConfig();
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{overflow: 'hidden', background: '#111'}}>
    <Video src={staticFile(src)} muted objectFit="cover" trimBefore={offset * fps} premountFor={fps} style={{width: '100%', height: '100%', filter: `grayscale(${monochrome ? 1 : 0})`, scale: interpolate(frame, [0, 6 * fps], [1, 1.055], clamp)}} />
    <AbsoluteFill style={{background: `rgba(0,0,0,${dim})`}} />
  </AbsoluteFill>;
};

export const SceneLabel: React.FC<{number: string; children: React.ReactNode; dark?: boolean}> = ({number, children, dark = false}) => <div style={{position: 'absolute', left: '7%', right: '7%', top: '6%', display: 'flex', justifyContent: 'space-between', fontFamily: sans, fontSize: 24, letterSpacing: 3, textTransform: 'uppercase', color: dark ? '#55564f' : '#e8e8df', zIndex: 3}}><span>{number}</span><span>{children}</span></div>;

export const Reveal: React.FC<{children: React.ReactNode; delay?: number; style?: React.CSSProperties}> = ({children, delay = 0, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return <div data-lab-text style={{opacity: interpolate(frame, [delay * fps, (delay + 0.32) * fps], [0, 1], clamp), translate: `0 ${interpolate(frame, [delay * fps, (delay + 0.48) * fps], [35, 0], clamp)}px`, ...style}}>{children}</div>;
};
