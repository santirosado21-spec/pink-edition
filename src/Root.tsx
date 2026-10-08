import { MyComposition } from "./Composition";
import { FullDemoComposition } from "./FullDemo";
import { staticFile } from "remotion";

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
      `}</style>
      <MyComposition />
      <FullDemoComposition />
    </>
  );
};
