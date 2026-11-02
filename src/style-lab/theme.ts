import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

// Local assets: no font-provider requests during preview or render.
export const styleFontsReady = Promise.all([
  loadFont({family: 'LabSans', url: staticFile('InterDisplay-Bold.ttf'), weight: '700'}),
  loadFont({family: 'LabScript', url: staticFile('style-lab/Italianno-Regular.ttf'), weight: '400'}),
]);

export type StyleLabProps = {accent: string; monochrome: boolean};
export const sans = 'LabSans, sans-serif';
export const script = 'LabScript, cursive';
export const media = {
  light: 'style-lab/forest.mp4',
  tracking: 'style-lab/forest-tracking.mp4',
  dawn: 'style-lab/forest-dawn.mp4',
};
