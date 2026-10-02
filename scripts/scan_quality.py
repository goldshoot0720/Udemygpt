"""Corpus quality scan: simplified characters (OpenCC per-char), untranslated
cues, AI-residue phrases, length anomalies, number mismatches, repeats.
Hits are candidates for human review, not an error count.

Usage: python3 scripts/scan_quality.py ROOT OUT.json
"""
import json,re,sys,glob,collections
from pathlib import Path
import opencc
s2t=opencc.OpenCC('s2t'); t2s=opencc.OpenCC('t2s')
root=Path(sys.argv[1])
CJK=re.compile(r'[一-鿿]')
# per-char simplified detection
cache={}
def simp(ch):
    if ch not in cache:
        cache[ch]= s2t.convert(ch)!=ch and t2s.convert(ch)==ch
    return cache[ch]
TOK=re.compile(r"[A-Za-z][A-Za-z0-9_]*(?:[.\-][A-Za-z0-9_]+)*")
NUM=re.compile(r'\d+(?:\.\d+)?')
STOP=set("the a an and or of to in on for is are was were be been it its this that with as at by you we i if so but not do does can could would should will shall may might have has had from your our their just now then here there what which who all also one two very".split())
JUNK=re.compile(r'翻譯|譯文|譯註|ChatGPT|```|抱歉|以下是|原文|\\n|�|英文：|中文：')
lex=lambda t:{m.lower() for m in TOK.findall(t or '') if m.lower() not in STOP and len(m)>=3}
issues=collections.defaultdict(list); stats=collections.Counter()
for f in sorted([p for p in root.glob('data/courses/*/translations/*.json') if p.name.startswith(('tw-','ChatGPT-'))]):
    cid=f.parts[-3]
    try: b=json.loads(f.read_bytes())
    except Exception as e: issues['badjson'].append([str(f),str(e)]);continue
    for L in b.get('lectures',[]):
        cs=L.get('cues',[]); lid=str(L['id'])
        stats['lec']+=1
        en=[c.get('en','') for c in cs]; zh=[c.get('zh','') or '' for c in cs]
        tk=[lex(e) for e in en]; zl=[z.lower() for z in zh]
        for i,c in enumerate(cs):
            stats['cue']+=1
            e,z=en[i],zh[i]; key=[cid,lid,c['id'],e,z]
            if not z.strip(): issues['empty'].append(key);continue
            sc=[ch for ch in z if simp(ch)]
            if sc: issues['simplified'].append(key+[''.join(sc)])
            nw=len(re.findall(r'[A-Za-z]+',e)); nc=len(CJK.findall(z))
            if nw>=4 and nc==0: issues['no_cjk'].append(key)
            if z.strip()==e.strip() and nw>=3: issues['same_as_en'].append(key)
            if JUNK.search(z): issues['junk'].append(key)
            if nw>=12 and nc<=nw*0.25: issues['too_short'].append(key)
            if nw<=3 and nc>=25: issues['too_long'].append(key)
            if i and z==zh[i-1] and e!=en[i-1] and len(z)>3: issues['adj_dup'].append(key)
            if re.search(r'(.{3,})\1\1',z): issues['repeat'].append(key)
            ne=set(NUM.findall(e)); nz=set(NUM.findall(z))
            # numbers spelled in English words are fine; flag numbers in zh absent in en and neighbours
            extra={n for n in nz-ne if not any(n in NUM.findall(en[j]) for j in (i-1,i+1) if 0<=j<len(en))}
            if extra and not any(n in e for n in extra): issues['num_mismatch'].append(key+[sorted(extra)])
        # run-based misalignment: tokens of en[i] found in zh[i+d] but not zh[i], over consecutive cues
        for d in (-1,1):
            run=[]
            for i in range(len(cs)):
                j=i+d
                hit=False
                if 0<=j<len(cs) and tk[i]:
                    here=sum(t in zl[i] for t in tk[i]); there=sum(t in zl[j] for t in tk[i])
                    hit = there>0 and here==0 and not (tk[j] and all(t in zl[i] for t in tk[j]) and False)
                if hit: run.append(i)
                else:
                    if len(run)>=2: issues['shift_run'].append([cid,lid,d,[cs[k]['id'] for k in run]])
                    run=[] if not hit else run
            if len(run)>=2: issues['shift_run'].append([cid,lid,d,[cs[k]['id'] for k in run]])
print(dict(stats))
for k,v in issues.items(): print(k,len(v))
json.dump(issues,open(sys.argv[2],'w'),ensure_ascii=False,indent=0)
