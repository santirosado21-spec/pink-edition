import { DEFAULT_PREFERENCES } from './preferences';
import { registerRoot, Composition } from 'remotion';
import { OneShotVideo } from './OneShotVideo';
import type { OneShotVideoProps } from './OneShotVideo';
const Root = () => <Composition id="OneShot" component={OneShotVideo} width={1280} height={720} fps={30} durationInFrames={30} defaultProps={{ mediaBase: '', edit: { fps:30,width:1280,height:720,frames:30,preferences:DEFAULT_PREFERENCES,scenes:[],captions:[],beats:[],music:null,musicFrames:1,issues:[],assets:[],checks:{} } }} calculateMetadata={({ props }: { props: OneShotVideoProps }) => ({ width: props.edit.width, height: props.edit.height, durationInFrames: props.edit.frames, fps: props.edit.fps })} />;
registerRoot(Root);
