import { MyComposition } from "./Composition";
import { FullDemoComposition } from "./FullDemo";
import { Composition, Folder, staticFile } from "remotion";
import {z} from "zod";
import { StyleShowcase } from "./style-lab/StyleShowcase";
import {OpeningScene, EmphasisScene, ClosingScene} from "./style-lab/TypographyScene";
import {DiagramScene} from "./style-lab/DiagramScene";
import {CalloutScene, MosaicScene} from "./style-lab/FootageScenes";

const styleLabSchema = z.object({accent: z.string().regex(/^#[0-9a-fA-F]{6}$/), monochrome: z.boolean()});

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <style>{`
        @font-face {
          font-family: InterDisplay;
          src: url('${staticFile("InterDisplay-Bold.ttf")}') format('truetype');
          font-style: normal;
          font-weight: 700;
          font-display: block;
        }
        @font-face { font-family: PlexSerif; src: url('${staticFile("fonts/IBMPlexSerif-Bold.ttf")}') format('truetype'); font-weight: 700; font-display: block; }
        @font-face { font-family: PlexMono; src: url('${staticFile("fonts/IBMPlexMono-Bold.ttf")}') format('truetype'); font-weight: 700; font-display: block; }
      `}</style>
      <MyComposition />
      <FullDemoComposition />
      <Folder name="Style-Lab">
        <Composition id="CinematicStyleLab" component={StyleShowcase} width={1920} height={1080} fps={30} durationInFrames={600} schema={styleLabSchema} defaultProps={{accent: '#bb3d35', monochrome: true}} />
        <Composition id="CinematicStyleLabVertical" component={StyleShowcase} width={1080} height={1920} fps={30} durationInFrames={600} schema={styleLabSchema} defaultProps={{accent: '#bb3d35', monochrome: true}} />
        <Folder name="Scenes">
          <Composition id="LabOpening" component={OpeningScene} width={1920} height={1080} fps={30} durationInFrames={90} defaultProps={{accent: '#bb3d35', monochrome: true}} />
          <Composition id="LabEmphasis" component={EmphasisScene} width={1920} height={1080} fps={30} durationInFrames={90} defaultProps={{accent: '#bb3d35', monochrome: true}} />
          <Composition id="LabDiagram" component={DiagramScene} width={1920} height={1080} fps={30} durationInFrames={120} defaultProps={{accent: '#bb3d35', monochrome: true}} />
          <Composition id="LabCallout" component={CalloutScene} width={1920} height={1080} fps={30} durationInFrames={90} defaultProps={{accent: '#bb3d35', monochrome: true}} />
          <Composition id="LabMosaic" component={MosaicScene} width={1920} height={1080} fps={30} durationInFrames={120} defaultProps={{accent: '#bb3d35', monochrome: true}} />
          <Composition id="LabClosing" component={ClosingScene} width={1920} height={1080} fps={30} durationInFrames={90} defaultProps={{accent: '#bb3d35', monochrome: true}} />
        </Folder>
      </Folder>
    </>
  );
};
