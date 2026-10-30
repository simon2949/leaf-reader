"""Local browser preview. Android uses its own private file store and SQLite bridge."""
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from urllib.request import urlopen,Request
import json,sqlite3,argparse
ROOT=Path(__file__).resolve().parents[1];ASSETS=ROOT/'app/src/main/assets'
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ASSETS/'web'),**kwargs)
 def do_GET(self):
  parsed=urlparse(self.path);q=parse_qs(parsed.query)
  if parsed.path=='/__api/lookup':
   word=q.get('word',[''])[0].lower();db=sqlite3.connect(ASSETS/'dictionary.db');db.row_factory=sqlite3.Row
   forms=db.execute('SELECT lemma FROM forms WHERE form=? AND lemma!=? ORDER BY length(lemma) LIMIT 1',(word,word)).fetchone();result=None
   for candidate in ([forms[0],word] if forms else [word]):
    r=db.execute('SELECT word,phonetic,zh,en FROM entries WHERE word=?',(candidate,)).fetchone()
    if r:result={**dict(r),'queried':word};break
   db.close();self.respond(result);return
  if parsed.path=='/__api/article':
   try:
    url=q.get('url',[''])[0]
    if not url.startswith('https://'):raise ValueError('请输入 HTTPS 链接')
    r=urlopen(Request(url,headers={'User-Agent':'LeafReader/0.1'}),timeout=12);data=r.read(8*1024*1024+1)
    if len(data)>8*1024*1024:raise ValueError('文章过大')
    self.respond({'html':data.decode('utf-8',errors='replace'),'url':r.url})
   except Exception as e:self.respond({'error':str(e)},400)
   return
  if parsed.path.startswith('/audio/') or parsed.path in ('/resource-stats.json',):
   file=ASSETS/parsed.path.lstrip('/')
   if not file.resolve().is_relative_to(ASSETS.resolve()):self.send_error(403);return
   if not file.exists():self.send_error(404);return
   data=file.read_bytes();self.send_response(200);self.send_header('Content-Type','audio/ogg' if file.suffix=='.ogg' else 'application/json');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data);return
  return super().do_GET()
 def do_POST(self):
  if self.path!='/__api/word-forms':self.send_error(404);return
  try:
   size=int(self.headers.get('Content-Length','0'))
   if size>1024*1024:raise ValueError('Request too large')
   words=json.loads(self.rfile.read(size)).get('words',[])
   if not isinstance(words,list):raise ValueError('Invalid words')
   words=list(dict.fromkeys(w for w in words if isinstance(w,str) and len(w)<=100))
   db=sqlite3.connect(ASSETS/'dictionary.db');rows=[]
   for i in range(0,len(words),400):
    chunk=words[i:i+400];params=','.join('?' for _ in chunk)
    rows.extend({'form':f,'lemma':l} for f,l in db.execute(f"SELECT f.form,f.lemma FROM forms f WHERE f.lemma IN ({params}) AND f.form!=f.lemma AND NOT EXISTS(SELECT 1 FROM forms g WHERE g.form=f.form AND g.lemma!=f.lemma AND g.lemma!=g.form)",chunk))
   db.close();self.respond(rows)
  except Exception as e:self.respond({'error':str(e)},400)
 def respond(self,data,status=200):
  encoded=json.dumps(data,ensure_ascii=False).encode();self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(encoded)));self.end_headers();self.wfile.write(encoded)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=4173);args=p.parse_args();print(f'Leaf preview: http://127.0.0.1:{args.port}',flush=True);ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
