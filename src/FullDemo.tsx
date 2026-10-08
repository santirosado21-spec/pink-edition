import { Composition } from "remotion";
import defaultPlan from "../projects/piscina/plan.json";
import defaultStyle from "../style/pink-demo-v1.json";
import { PinkEdit } from "./PinkEdit";
import type { EditProps, Plan, Timeline } from "./edit";
import defaultTimeline from "./pool-full-timeline.json";

const poolDefaults: EditProps = {
  style: defaultStyle,
  plan: defaultPlan as unknown as Plan,
  timeline: defaultTimeline as unknown as Timeline,
  media: { source: "client/pool-raw-full.mp4", person: "client/pool-person.webm" },
};

// `PinkEdit` edita cualquier video con `--props`; `PoolFullDemo` es la demo de piscina.
export const FullDemoComposition = () => (
  <>
    {["PinkEdit", "PoolFullDemo"].map((id) => (
      <Composition
        key={id}
        id={id}
        component={PinkEdit}
        defaultProps={poolDefaults}
        calculateMetadata={({ props }) => ({
          durationInFrames: props.timeline.duration_frames,
          fps: props.style.fps,
          width: props.style.width,
          height: props.style.height,
        })}
      />
    ))}
  </>
);
