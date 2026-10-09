from __future__ import annotations
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def write_json(rel, obj):
    p=ROOT/rel; p.parent.mkdir(parents=True,exist_ok=True); p.write_text(json.dumps(obj,ensure_ascii=False,indent=2),encoding='utf-8')

def valid_pair(q,a):
    qs=q.get('questions',[]); answers=a.get('answers',{}); errors=[]
    if len(qs) not in (150,300): errors.append(f'Question record count must be 150 or 300, got {len(qs)}')
    missing=[str(i) for i in range(1,151) if str(i) not in answers]
    if missing: errors.append(f'Missing default answers: {missing[:10]}')
    b=q.get('booklet_code') or (qs[0].get('booklet_code') if qs else '')
    if not b: errors.append('Missing booklet_code')
    langs={x.get('language') for x in qs if x.get('language')}
    for lang in ('en','hi'):
        if lang not in langs: continue
        v=(a.get('language_variants') or {}).get(lang,{})
        miss=[str(i) for i in range(91,151) if str(i) not in v]
        if miss: errors.append(f'Missing {lang} variant answers: {miss[:10]}')
    if a.get('inferred_answers'): errors.append('Inferred answers are not allowed for published uploads')
    return errors,b

class Handler(BaseHTTPRequestHandler):
    def _send(self,code,obj):
        body=json.dumps(obj,ensure_ascii=False).encode('utf-8'); self.send_response(code); self.send_header('Content-Type','application/json; charset=utf-8'); self.send_header('Content-Length',str(len(body))); self.send_header('Access-Control-Allow-Origin','*'); self.end_headers(); self.wfile.write(body)
    def do_OPTIONS(self): self.send_response(204); self.send_header('Access-Control-Allow-Origin','*'); self.send_header('Access-Control-Allow-Headers','Content-Type'); self.send_header('Access-Control-Allow-Methods','POST,OPTIONS'); self.end_headers()
    def do_GET(self):
        if self.path=='/api/health': self._send(200,{'ok':True,'root':str(ROOT)}); return
        self._send(404,{'error':'Not found'})
    def do_POST(self):
        if self.path!='/api/import-json': self._send(404,{'error':'Not found'}); return
        try:
            n=int(self.headers.get('Content-Length','0')); payload=json.loads(self.rfile.read(n)); q=payload['question_json']; a=payload['answer_key']
            errors,b=valid_pair(q,a)
            if errors: self._send(400,{'error':' '.join(errors)}); return
            paper={
                'schema_version':'2.0.0','paper_id':q.get('paper_id',f"{q.get('exam','EXAM')}-PAPER-I-{b}"),'exam':q.get('exam','EXAM'),'session':q.get('session',''),
                'exam_date':q.get('exam_date',''),'paper':'PAPER-I','booklet_code':b,'title':q.get('title',f"{q.get('exam','EXAM')} • Set {b}"),
                'question_count':150,'available_languages':sorted(set(x.get('language') for x in q.get('questions',[]) if x.get('language'))),'status':'published'
            }
            validation={'schema_version':'2.0.0','paper_id':paper['paper_id'],'validation_status':'PASS','publication_status':'published','question_records':len(q.get('questions',[])),'default_answer_count':len(a.get('answers',{})),'variant_answer_counts':{k:len(v) for k,v in a.get('language_variants',{}).items()},'missing_default_answers':[],'issues':[],'inferred_answer_questions':sorted([int(x) for x in a.get('inferred_answers',{})])}
            write_json(Path('data/papers')/b/'questions.json',q); write_json(Path('data/papers')/b/'paper.json',paper); write_json(Path('data/papers')/b/'validation.json',validation); write_json(Path('data/answer_keys')/b/'answer_key.json',a)
            from subprocess import run
            run(['python',str(ROOT/'processor'/'src'/'sync_data.py')],check=True,cwd=ROOT)
            self._send(200,{'ok':True,'message':f'Saved Set {b} to data/ and synced frontend/public/data.'})
        except Exception as e: self._send(500,{'error':str(e)})

if __name__=='__main__':
    print(f'Local admin writer listening at http://127.0.0.1:8765 (project: {ROOT})')
    HTTPServer(('127.0.0.1',8765),Handler).serve_forever()
