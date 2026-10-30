"""Download unmodified short public-domain works in official Gutenberg formats."""
from pathlib import Path
from urllib.request import Request,urlopen
import json,hashlib,struct,re,concurrent.futures
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'outputs/reading-test-pack'
BOOKS=[(14838,'01-peter-rabbit','The Tale of Peter Rabbit','Beatrix Potter'),(7256,'02-gift-of-the-magi','The Gift of the Magi','O. Henry'),(902,'03-happy-prince-and-other-tales','The Happy Prince, and Other Tales','Oscar Wilde')]
FORMATS={'txt':'txt.utf-8','epub':'epub3.images','mobi':'kindle.images','azw3':'kf8.images'}
def fetch(task):
 number,slug,title,author,ext,suffix=task
 url=f'https://www.gutenberg.org/ebooks/{number}.{suffix}';folder=OUT/slug;folder.mkdir(parents=True,exist_ok=True);path=folder/(slug+'.'+ext)
 req=Request(url,headers={'User-Agent':'LeafReader/0.1 (personal ebook compatibility testing)'})
 with urlopen(req,timeout=90) as r:
  data=r.read();final=r.url
 if ext=='epub' and data[:2]!=b'PK':raise ValueError('Not EPUB: '+url)
 if ext in ('mobi','azw3') and data[60:68]!=b'BOOKMOBI':raise ValueError('Not MOBI: '+url)
 if ext=='txt' and b'Project Gutenberg' not in data[:5000]:raise ValueError('Not text: '+url)
 path.write_bytes(data)
 info={'file':str(path.relative_to(OUT)),'title':title,'author':author,'source':f'https://www.gutenberg.org/ebooks/{number}','download':url,'resolvedUrl':final,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
 if ext in ('mobi','azw3'):
  offset=struct.unpack_from('>I',data,78)[0];info['mobiVersion']=struct.unpack_from('>I',data,offset+36)[0]
 print(info['file'],len(data),info.get('mobiVersion',''),flush=True)
 return info
if __name__=='__main__':
 OUT.mkdir(parents=True,exist_ok=True);tasks=[(*b,e,s) for b in BOOKS for e,s in FORMATS.items()]
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:files=list(pool.map(fetch,tasks))
 (OUT/'sources.json').write_text(json.dumps(files,indent=2,ensure_ascii=False))
