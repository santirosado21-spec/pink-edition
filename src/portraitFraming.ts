import type {EditScene} from './oneShotEdit';
export function portraitFraming(scene: EditScene | undefined, frame: number) {
  const keys=scene?.framing;
  if (!keys?.length) return {scale:1,x:0,y:0,captionTop:null,measured:false};
  const relative=frame-(scene?.from ?? 0);
  const before=[...keys].reverse().find(k=>k.frame<=relative) ?? keys[0];
  const after=keys.find(k=>k.frame>=relative) ?? keys[keys.length-1];
  const p=(relative-before.frame)/Math.max(1,after.frame-before.frame);
  return {scale:before.scale+(after.scale-before.scale)*p,x:before.x+(after.x-before.x)*p,y:before.y+(after.y-before.y)*p,
    captionTop:before.captionTop!==null && after.captionTop!==null?Math.max(before.captionTop,after.captionTop):null,
    measured:before.measured && after.measured};
}
