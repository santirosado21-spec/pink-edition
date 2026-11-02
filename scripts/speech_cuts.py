"""Conservative cuts and source-to-edit timing shared by analysis and worker."""
import math

def kept_intervals(spans, duration, fps=30, padding=.1, minimum_gap=.45):
    merged=[]
    for start,end in sorted(spans):
        start=max(0,float(start));end=min(duration,float(end))
        if end<=start:continue
        if merged and start-merged[-1][1]<minimum_gap:
            merged[-1][1]=max(merged[-1][1],end)
        else:merged.append([start,end])
    if not merged:return [{'start':0.,'end':math.ceil(duration*fps)/fps,'timelineStart':0.}]
    result=[];offset=0.
    for start,end in merged:
        start=math.floor(max(0,start-padding)*fps)/fps
        end=math.ceil(min(duration,end+padding)*fps)/fps
        result.append({'start':start,'end':end,'timelineStart':offset})
        offset+=end-start
    return result

def map_time(value, intervals):
    for segment in intervals:
        if segment['start']-1e-6<=value<=segment['end']+1e-6:
            return segment['timelineStart']+value-segment['start']
    raise ValueError(f'Speech timestamp outside retained intervals: {value}')
