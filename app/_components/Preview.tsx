"use client";

import { Player, type PlayerRef } from "@remotion/player";
import type { RefObject } from "react";
import { PinkEdit } from "../../src/PinkEdit";
import type { EditProps } from "../../src/edit";

// La misma composición que renderiza el motor, reproducida en el navegador.
export default function Preview({ props, playerRef }: { props: EditProps; playerRef: RefObject<PlayerRef | null> }) {
  return (
    <Player
      ref={playerRef}
      component={PinkEdit}
      inputProps={props}
      durationInFrames={props.timeline.duration_frames}
      fps={props.style.fps}
      compositionWidth={props.style.width}
      compositionHeight={props.style.height}
      controls
      acknowledgeRemotionLicense
      style={{ width: "100%", height: "100%" }}
    />
  );
}
