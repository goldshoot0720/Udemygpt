"""Cue-shift detector (zh[i] actually translates en[i±1]).

Scores each cue under offsets -1/0/+1 with three signals: sentence-end
punctuation landing, ASCII identifiers found in the English, and zh/en length
ratio. Flags windows of W cues where an offset beats 0 on (almost) every cue.

Usage: python3 scripts/detect_shift.py ROOT OUT.json [W] [--loose]
  ROOT is the repo root ('.'); strict W=6 is high-precision, --loose with W=4
  surfaces more candidates that need human reading (most are clause reorders).
"""
import json,re,sys,math,collections
from pathlib import Path
root=Path(sys.argv[1])
CJK=re.compile(r'[一-鿿]')
ZT=re.compile(r"[A-Za-z][A-Za-z0-9_]{2,}")
END_EN=re.compile(r'[.?!]["\')\]]*\s*$'); END_ZH=re.compile(r'[。？！?!.][」』"\')）]*\s*$')
def norm(e): return re.sub(r'[^a-z0-9]','',e.lower())
LOOSE='--loose' in sys.argv
args=[a for a in sys.argv[1:] if a!='--loose']
W=int(args[2]) if len(args)>2 else 6
MARGIN=0.6 if LOOSE else 0.9
res=[]
for f in sorted(root.glob('data/courses/*/translations/*.json')):
    if not f.name.startswith(('tw-','ChatGPT-')):continue
    cid=f.parts[-3]
    for L in json.loads(f.read_bytes())['lectures']:
        cs=L['cues'];n=len(cs)
        if n<W+2: continue
        en=[c['en'] for c in cs]; zh=[c['zh'] for c in cs]
        enw=[max(1,len(re.findall(r"[A-Za-z0-9']+",e))) for e in en]
        zl=[len(CJK.findall(z))+len(re.findall(r'[A-Za-z0-9]+',z)) for z in zh]
        r=sum(zl)/sum(enw)
        en_n=[norm(e) for e in en]
        se=[bool(END_EN.search(e)) for e in en]; sz=[bool(END_ZH.search(z)) for z in zh]
        zt=[[t.lower() for t in ZT.findall(z)] for z in zh]
        def sc(i,o):
            j=i+o
            if j<0 or j>=n: return None
            s=0.0
            s+= 1.0 if se[j]==sz[i] else -1.0
            s+= -abs(math.log((zl[i]+2)/(r*enw[j]+2)))*1.5
            if zt[i]:
                hit=sum(t in en_n[j] for t in zt[i])/len(zt[i]); s+=2*hit
            return s
        S={o:[sc(i,o) for i in range(n)] for o in (-1,0,1)}
        flagged=[]
        for i in range(0,n-W+1):
            win=range(i,i+W)
            if any(S[o][k] is None for o in (-1,1) for k in win): continue
            t={o:sum(S[o][k] for k in win) for o in (-1,0,1)}
            for o in (-1,1):
                # require: offset beats 0 by margin, and beats on majority of cues
                wins=sum(S[o][k]>S[0][k]+0.3 for k in win)
                if t[o]-t[0]>W*MARGIN and wins>=W-1: flagged.append((i,o,t[o]-t[0]))
        if flagged:
            # merge into regions
            regs=[];
            for i,o,m in flagged:
                if regs and regs[-1][2]==o and i<=regs[-1][1]+1: regs[-1][1]=i+W-1; regs[-1][3]=max(regs[-1][3],m)
                else: regs.append([i,i+W-1,o,m])
            for a,b,o,m in regs:
                res.append(dict(c=cid,l=str(L['id']),t=L.get('title',''),a=cs[a]['id'],b=cs[b]['id'],o=o,m=round(m,1),n=b-a+1))
print(len(res),'regions',len({(x['c'],x['l']) for x in res}),'lectures')
print(collections.Counter(x['c'] for x in res))
json.dump(res,open(sys.argv[2],'w'),ensure_ascii=False,indent=0)
