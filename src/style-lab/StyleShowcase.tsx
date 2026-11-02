import React from 'react';
import {Audio} from '@remotion/media';
import {Series, staticFile, useVideoConfig} from 'remotion';
import {DiagramScene} from './DiagramScene';
import {CalloutScene, MosaicScene} from './FootageScenes';
import {ClosingScene, EmphasisScene, OpeningScene} from './TypographyScene';
import {type StyleLabProps} from './theme';

export const StyleShowcase: React.FC<StyleLabProps> = (props) => {
  const {fps} = useVideoConfig();
  return <>
    <Audio src={staticFile('style-lab/ambient-original.wav')} volume={0.55} premountFor={fps} />
    <Series>
      <Series.Sequence name="01 — B-roll y firma tipográfica" durationInFrames={3 * fps} premountFor={fps}><OpeningScene {...props} /></Series.Sequence>
      <Series.Sequence name="02 — Énfasis cinético" durationInFrames={3 * fps} premountFor={fps}><EmphasisScene {...props} /></Series.Sequence>
      <Series.Sequence name="03 — Diagrama progresivo" durationInFrames={4 * fps} premountFor={fps}><DiagramScene {...props} /></Series.Sequence>
      <Series.Sequence name="04 — Foco y B-roll" durationInFrames={3 * fps} premountFor={fps}><CalloutScene {...props} /></Series.Sequence>
      <Series.Sequence name="05 — Mosaico" durationInFrames={4 * fps} premountFor={fps}><MosaicScene {...props} /></Series.Sequence>
      <Series.Sequence name="06 — Cierre" durationInFrames={3 * fps} premountFor={fps}><ClosingScene {...props} /></Series.Sequence>
    </Series>
  </>;
};
