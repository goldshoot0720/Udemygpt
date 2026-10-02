"""Adjacent-duplicate and missing-content detector.

dups: neighbouring cues share a long Chinese substring while their English does
not (typical after a merge/realignment: one cue's zh already covers the next).
miss: 4-cue windows whose zh length is far below the lecture's zh/en ratio.

Usage: python3 scripts/detect_adjacent_dup.py ROOT OUT.json
"""
import json,re,sys,collections,math
from pathlib import Path
from difflib import SequenceMatcher
root=Path(sys.argv[1])
CJK=re.compile(r'[一-鿿]')
strip=lambda s:re.sub(r'[\s,，.。?？!!:：;；、「」"\'()（）]','',s)
dups=[];miss=[]
for f in sorted(root.glob('data/courses/*/translations/tw-*.json')):
    cid=f.parts[-3]
    for L in json.loads(f.read_bytes())['lectures']:
        cs=L['cues'];n=len(cs)
        zs=[strip(c['zh']) for c in cs]
        for i in range(n-1):
            a,b=zs[i],zs[i+1]
            if len(a)<6 or len(b)<6: continue
            m=SequenceMatcher(None,a,b,autojunk=False).find_longest_match(0,len(a),0,len(b))
            if m.size>=8:
                sub=a[m.a:m.a+m.size]
                # ignore if English also repeats
                ea=cs[i]['en'].lower(); eb=cs[i+1]['en'].lower()
                if SequenceMatcher(None,ea,eb).find_longest_match(0,len(ea),0,len(eb)).size>=max(12,m.size): continue
                if not CJK.search(sub) or len(CJK.findall(sub))<5: continue
                dups.append([cid,str(L['id']),cs[i]['id'],sub])
        # missing: window of 4 cues
        enw=[max(1,len(re.findall(r"[A-Za-z0-9']+",c['en']))) for c in cs]
        zl=[len(CJK.findall(c['zh']))+len(re.findall(r'[A-Za-z0-9]+',c['zh'])) for c in cs]
        if sum(enw)<40: continue
        r=sum(zl)/sum(enw)
        for i in range(n-3):
            e=sum(enw[i:i+4]); z=sum(zl[i:i+4])
            if e>=25 and z<0.45*r*e: miss.append([cid,str(L['id']),cs[i]['id'],round(z/(r*e),2)])
print('dups',len(dups),'miss',len(miss))
json.dump({'dups':dups,'miss':miss},open(sys.argv[2],'w'),ensure_ascii=False)
