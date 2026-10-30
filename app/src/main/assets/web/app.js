import './vendor/foliate/view.js';
import {fontPickerHTML,mountFontPicker} from './font-picker.js';
import {readerIcons,readingPalette,brightnessValue,flattenChapters} from './reader-chrome.js';
import {swipeDirection,edgeDirection,underlineSavedWords} from './reader-interactions.js';
import {migrateVocabularyState,collectWord,encountersOf,hasEncounter,encounterKey,encounterOf,sourceName} from './vocabulary.js';
import {mountVocabulary,editWordTags} from './vocabulary-view.js';
import {readingFonts,alignments,selectedFont,selectedAlignment,fontFace,fontFamily} from './reading-preferences.js';
import {dailyPhraseFor,nextPhraseUpdate} from './daily-phrases.js';
import {call,bookFile,native} from './platform.js';
import {escapeHTML as esc,normalizeWord,wordAt,sentenceAt,highlightContext,textBook,validateState} from './core.js';
const $=s=>document.querySelector(s);
// Keep the reading navigation above modal scrims without lifting the book itself.
document.body.append($('#reader-footer'));
const defaults={theme:'paper',fontSize:20,lineHeight:1.85,margin:24,dictionary:'zh',fontFamily:'noto-serif',textAlign:'left',volumeKeys:false,pageAnimation:true,savedUnderlines:true,dayTheme:'paper',brightnessMode:'system',brightnessLevel:60};
let state={version:1,books:[],words:[],wordTags:[],settings:{...defaults}},tab='home',view=null,current=null,location=null,activeWord=null,sheetKind='',saveChain=Promise.resolve(),saveTimer,toastTimer,queryVersion=0,audioVersion=0,playing=null,audioButton=null,returnFocus=null,menuHidden=false,restoring=false,phraseTimer;
let refreshVocabulary=null,savedForms=new Map(),formsSignature='',formsRequest=0,underlineFrame=0,pageTurning=false,readingChapters=[],progressDragging=false;
const colors=['#42634e','#a46f52','#465a71','#80734b','#796582'];
function toast(text){$('#toast').textContent=text;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,3200);}
function save(){refreshSavedForms();if(restoring)return saveChain;clearTimeout(saveTimer);const snapshot=JSON.parse(JSON.stringify(state));saveChain=saveChain.catch(()=>{}).then(()=>call('saveState',snapshot));saveChain.catch(e=>toast('保存失败：'+e.message));return saveChain;}
function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(save,250);}
function applyTheme(){document.body.classList.toggle('theme-night',state.settings.theme==='night');document.body.classList.toggle('theme-white',state.settings.theme==='white');updateModeButton();if(native)window.Android.setAppearance?.(state.settings.theme);}
function openSheet(title,html,kind='generic'){
 returnFocus=document.activeElement;sheetKind=kind;const panel=!!current&&['reader-settings','reader-toc'].includes(kind);if(panel)setReaderControls(true);$('#sheet').classList.toggle('reading-panel',panel);$('#reader-footer').classList.toggle('panel-open',panel);updateReaderAction();syncReadingKeys(false);$('#sheet').classList.toggle('dictionary-sheet',kind==='dictionary');$('#scrim').hidden=false;$('#sheet').hidden=false;
 $('#sheet').innerHTML=`<div class="sheet-head"><h2 id="sheet-title">${esc(title)}</h2><button class="sheet-close" aria-label="关闭">×</button></div>${html}`;
 $('#sheet').scrollTop=0;$('#sheet .sheet-close').onclick=closeSheet;setTimeout(()=>$('#sheet .sheet-close')?.focus(),0);
}
function stopAudio(){audioVersion++;if(playing){playing.pause();playing=null;}window.meSpeak?.stop();setAudioState('idle');audioButton=null;}
function closeSheet(){const wasDictionary=sheetKind==='dictionary';queryVersion++;stopAudio();$('#sheet').hidden=true;$('#scrim').hidden=true;sheetKind='';$('#reader-footer').classList.remove('panel-open');updateReaderAction();returnFocus?.focus?.();syncReadingKeys();if(wasDictionary&&tab==='words'&&!current)refreshVocabulary?.();}
$('#scrim').onclick=closeSheet;
document.addEventListener('keydown',e=>{if(e.key==='Escape')window.appBack();if(!$('#sheet').hidden&&e.key==='Tab'){const items=[...$('#sheet').querySelectorAll('button:not(:disabled),input:not(:disabled),textarea,select,a[href]'),...($('#sheet').classList.contains('reading-panel')?[...$('#reader-footer .reader-actions').querySelectorAll('button')]:[])].filter(el=>el.getClientRects().length);const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}if(view&&$('#sheet').hidden){if(e.key==='ArrowRight')run(()=>turnPage('next'));if(e.key==='ArrowLeft')run(()=>turnPage('prev'));}});
window.appBack=()=>{if(!$('#sheet').hidden)closeSheet();else if(current&&!menuHidden)setReaderControls(false);else if(current)exitReader();else if(tab!=='home')navigate('home');else return false;return true;};
function bookAuthor(book){return book.demo&&book.author==='A Leaf Original'?'':book.author||'';}
function cover(book){return `<div class="book-cover" style="--cover:${colors[book.color%colors.length]||colors[0]}"><span class="cover-title">${esc(book.title)}</span>${bookAuthor(book)?`<span class="cover-author">${esc(bookAuthor(book))}</span>`:''}</div>`;}
function percent(book){return Math.min(100,Math.max(0,Math.round((book.progress||0)*100)));}
function navigate(next){tab=next;document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));render();}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>navigate(b.dataset.tab));
$('#header-settings').onclick=()=>navigate('settings');
function render(){
 applyTheme();
 $('#page-title').textContent=({home:'阅读',library:'书架',words:'生词本',settings:'设置'})[tab];
 if(tab==='home')home();else if(tab==='library')library();else if(tab==='words')words();else settings();
}
function home(){
 const recent=[...state.books].filter(b=>b.lastRead).sort((a,b)=>b.lastRead-a.lastRead)[0]||state.books[0];
 $('#main').innerHTML=`<section aria-labelledby="continue-heading"><div class="section-head home-section-head"><h2 id="continue-heading">继续阅读</h2></div>${recent?`<div class="continue-card">${cover(recent)}<div class="continue-info"><h2>${esc(recent.title)}</h2>${bookAuthor(recent)?`<p class="continue-author">${esc(bookAuthor(recent))}</p>`:''}<div class="muted book-progress">已读 ${percent(recent)}%</div><button class="primary" id="continue">${recent.lastRead?'继续阅读':'开始阅读'} <span aria-hidden="true">→</span></button></div></div>`:`<div class="empty continue-empty"><p>书架中还没有书籍</p><button class="primary" id="go-library">前往书架</button></div>`}</section><section class="daily-section" aria-labelledby="daily-heading"><div class="section-head"><h2 id="daily-heading">每日短语</h2><time id="phrase-date" class="count"></time></div><article id="daily-phrase" class="phrase-card"></article></section>`;
 if(recent)$('#continue').onclick=()=>openReader(recent.id);else $('#go-library').onclick=()=>navigate('library');
 updateDailyPhrase();
}
function updateDailyPhrase(){
 const card=$('#daily-phrase');if(!card)return;
 const phrase=dailyPhraseFor();if(card.dataset.date===phrase.key)return;
 card.dataset.date=phrase.key;card.dataset.background=phrase.background;
 card.style.setProperty('--daily-image',`url("./images/daily/${phrase.background}.svg")`);
 const date=$('#phrase-date');date.dateTime=phrase.key;date.textContent=phrase.key.replaceAll('-','.');
 card.innerHTML=`<h3 lang="en" class="phrase-text">${esc(phrase.text)}</h3><p class="phrase-meaning">${esc(phrase.meaning)}</p><div class="phrase-example"><p lang="en">${esc(phrase.example)}</p><p class="muted">${esc(phrase.translation)}</p></div>`;
 fitDailyPhrase();
}
// Measure the actual rendered serif text so a short phrase stays on one line
// without making longer phrases or accessibility-scaled text unreadably small.
function fitDailyPhrase(){
 const title=$('#daily-phrase .phrase-text');if(!title)return;
 title.style.fontSize='28px';title.style.whiteSpace='nowrap';
 const range=document.createRange();range.selectNodeContents(title);
 const width=range.getBoundingClientRect().width,available=title.clientWidth;
 const size=Math.min(28,Math.floor(28*(available-1)/Math.max(1,width)*10)/10);
 if(size>=22)title.style.fontSize=size+'px';
 else title.style.whiteSpace='normal';
}
let phraseWidth=0;
new ResizeObserver(entries=>{const width=entries[0].contentRect.width;if(width!==phraseWidth){phraseWidth=width;fitDailyPhrase();}}).observe($('#main'));
document.fonts.ready.then(fitDailyPhrase);
function scheduleDailyPhrase(){
 clearTimeout(phraseTimer);
 updateDailyPhrase();
 phraseTimer=setTimeout(scheduleDailyPhrase,nextPhraseUpdate()+50);
}
function library(){
 $('#main').innerHTML=`<div class="section-head library-section-head"><h2>我的书籍 <span class="count">${state.books.length}</span></h2><button class="primary" id="import">＋ 导入</button></div><label class="search"><span class="muted">⌕</span><input id="book-search" placeholder="搜索书名或作者" aria-label="搜索书名或作者"></label><div id="books" class="book-grid"></div>`;
 $('#import').onclick=importMenu;
 const draw=()=>{const q=$('#book-search').value.trim().toLowerCase();const list=state.books.filter(b=>(b.title+' '+(b.author||'')).toLowerCase().includes(q));
 $('#books').innerHTML=list.length?list.map(b=>`<article class="book-tile"><button data-open="${b.id}" aria-label="阅读 ${esc(b.title)}">${cover(b)}<div class="book-name">${esc(b.title)}</div>${bookAuthor(b)?`<div class="book-author">${esc(bookAuthor(b))}</div>`:''}<div class="book-meta"><span>${esc(b.format||'TXT')}${b.lastRead?' · 已读 '+percent(b)+'%':''}</span></div></button><button class="book-more" data-more="${b.id}" aria-label="管理 ${esc(b.title)}">⋯</button></article>`).join(''):`<div class="empty" style="grid-column:1/-1">${q?'没有找到这本书':'书架还是空的，导入第一本书吧。'}</div>`;
 document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openReader(b.dataset.open));document.querySelectorAll('[data-more]').forEach(b=>b.onclick=()=>manageBook(b.dataset.more));};$('#book-search').oninput=draw;draw();
}
function importMenu(){openSheet('把故事放进书架',`<p class="sheet-note">书籍和文章保存在手机本地，随时离线阅读。</p><button class="import-option" id="import-file"><span>▤</span><div><strong>导入电子书</strong><small>TXT · EPUB · MOBI · AZW · AZW3，无 DRM</small></div></button><button class="import-option" id="import-link"><span>↗</span><div><strong>保存网页文章</strong><small>联网提取正文，保存后离线阅读</small></div></button><button class="import-option" id="import-paste"><span>✎</span><div><strong>粘贴英文文章</strong><small>留下一段值得慢慢读的文字</small></div></button>`);
 $('#import-file').onclick=async()=>{closeSheet();await run(async()=>{const result=await call('importFile');if(result)await addFile(result);});};$('#import-link').onclick=linkForm;$('#import-paste').onclick=()=>pasteForm();}
async function run(fn){try{return await fn();}catch(e){console.error(e);toast(e.message||'操作失败，请重试');}}
function pasteForm(title='',text=''){openSheet('保存文章',`<label class="form-label" for="article-title">标题</label><input class="text-input" id="article-title" maxlength="180" placeholder="给文章起个名字" value="${esc(title)}"><label class="form-label" for="article-text">正文</label><textarea class="text-input" id="article-text" placeholder="粘贴英文内容…">${esc(text)}</textarea><button id="save-article" class="primary wide" style="margin-top:18px">保存到书架</button>`);
 $('#save-article').onclick=()=>run(async()=>{const title=$('#article-title').value.trim(),text=$('#article-text').value.trim();if(!title||!text)throw Error('请填写标题和正文');const b=$('#save-article');b.disabled=true;try{const result=await call('saveText',{name:title,text});await addFile(result,{title});closeSheet();}finally{b.disabled=false;}});}
function linkForm(){openSheet('保存网页文章',`<p class="sheet-note">输入 HTTPS 链接，提取后可预览和修改正文。需要登录或限制访问的网页可改用粘贴导入。</p><label class="form-label" for="article-url">文章链接</label><input class="text-input" type="url" id="article-url" placeholder="https://…"><button id="fetch-article" class="primary wide" style="margin-top:18px">提取正文</button>`);
 $('#fetch-article').onclick=()=>run(async()=>{const url=$('#article-url').value.trim();if(!/^https:\/\//i.test(url))throw Error('请输入 HTTPS 网页链接');const b=$('#fetch-article');b.disabled=true;b.textContent='正在提取…';try{const result=await call('fetchArticle',{url});const doc=new DOMParser().parseFromString(result.html,'text/html');const article=new Readability(doc).parse();if(!article?.textContent?.trim())throw Error('未能提取正文，请使用粘贴导入');pasteForm(article.title||'网页文章',article.textContent.trim());}finally{b.disabled=false;b.textContent='提取正文';}});}
function metadataString(value){if(typeof value==='string')return value;if(Array.isArray(value))return value.map(metadataString).join(', ');if(value?.name)return metadataString(value.name);return value?Object.values(value).find(x=>typeof x==='string')||'':'';}
async function decodeBook(file,title){if(file.name.toLowerCase().endsWith('.txt')){const bytes=await file.arrayBuffer();let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{text=new TextDecoder('gb18030').decode(bytes);}if(!text.trim())throw Error('文件没有可阅读的正文');return textBook(text,title);}const {makeBook}=await import('./vendor/foliate/view.js');return await makeBook(file);}
async function addFile(result,extra={}){
 let parsed;try{
  const file=await bookFile(result);const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer())),n=>n.toString(16).padStart(2,'0')).join('');
  const existing=state.books.find(b=>b.hash===hash);
  if(existing){
   let available=true;try{await bookFile(existing);}catch{available=false;}
   if(available){await call('deleteBook',{file:result.file});toast('这本书已经在书架上了');}
   else {existing.file=result.file;existing.name=result.name;await save();if(tab==='library')library();toast('原书已重新关联，阅读进度与书签已保留');}
   return;
  }
  parsed=await decodeBook(file,result.name.replace(/\.[^.]+$/,''));
  if(!parsed.sections?.length)throw Error('未找到可阅读的章节');
  const book={id:crypto.randomUUID(),...result,title:metadataString(parsed.metadata?.title)||result.name.replace(/\.[^.]+$/,''),author:metadataString(parsed.metadata?.author),format:result.name.split('.').pop().toUpperCase(),hash,color:state.books.length%colors.length,createdAt:Date.now(),progress:0,bookmarks:[],...extra};
  state.books.push(book);await save();if(tab==='library')library();toast('已加入书架');
 }catch(e){await call('deleteBook',{file:result.file});throw Error(/DRM|encrypt/i.test(e.message)?'这本书带有 DRM 保护，无法导入':('导入失败：'+e.message));}finally{parsed?.destroy?.();}
}
function manageBook(id){const b=state.books.find(x=>x.id===id);openSheet(b.title,`<p class="sheet-note">${esc(b.author||'本地导入')} · ${esc(b.format)} · 已读 ${percent(b)}%</p><button class="secondary wide" id="rename-book">修改书名</button><button class="secondary wide danger" id="delete-book" style="margin-top:12px">从书架删除</button><p class="sheet-note" style="margin-top:14px">删除书籍会保留收藏的单词和原句。</p>`);
 $('#rename-book').onclick=()=>{openSheet('修改书名',`<input class="text-input" id="new-title" maxlength="180" value="${esc(b.title)}"><button class="primary wide" id="confirm-title" style="margin-top:15px">保存</button>`);$('#confirm-title').onclick=()=>run(async()=>{const title=$('#new-title').value.trim();if(!title)throw Error('书名不能为空');b.title=title;await save();closeSheet();library();});};
 $('#delete-book').onclick=()=>{openSheet('删除这本书？',`<p class="sheet-note">将删除「${esc(b.title)}」及其阅读进度，生词收藏仍会保留。</p><button class="primary wide" id="confirm-delete">确认删除</button>`);$('#confirm-delete').onclick=()=>run(async()=>{await call('deleteBook',{file:b.file});state.books=state.books.filter(x=>x.id!==id);await save();closeSheet();library();});};}
async function openReader(id,target){
 await run(async()=>{
 const b=state.books.find(x=>x.id===id);if(!b)throw Error('原书已删除，原句仍保存在生词本中');
 if(view){view.close();view.remove();view=null;}
 current=b;location=null;readingChapters=[];progressDragging=false;$('#reading').hidden=false;setReaderControls(false);$('#reader-title').textContent=b.title;$('#reader-body').innerHTML='<div class="loading">正在打开故事…</div>';
 try{
  const file=await bookFile(b),book=await decodeBook(file,b.title);
  view=document.createElement('foliate-view');$('#reader-body').replaceChildren(view);attachPageInput(view,null);
  view.addEventListener('load',e=>attachReading(e.detail.doc,e.detail.index));
  view.addEventListener('external-link',e=>e.preventDefault());
  view.addEventListener('relocate',e=>{
   scheduleUnderlines();location=e.detail;b.cfi=location.cfi;b.progress=Number.isFinite(location.fraction)?location.fraction:0;b.lastRead=Date.now();
   updateReaderProgress();$('#bookmark').textContent=b.bookmarks?.some(x=>x.cfi===b.cfi)?'★':'☆';scheduleSave();
  });
  await view.open(book);const chapters=flattenChapters(view.book.toc);readingChapters=chapters.length?chapters:view.book.sections.map((section,index)=>({label:section.title||`第 ${index+1} 章`,href:index}));await Promise.all(readingChapters.map(async chapter=>{try{chapter.section=(await view.resolveNavigation(chapter.href))?.index;}catch{}}));applyReadingStyles();
  await view.init({lastLocation:target||b.cfi,showTextStart:true});
  b.lastRead=Date.now();scheduleSave();syncReadingKeys();refreshSavedForms();scheduleUnderlines();
 }catch(e){exitReader();throw e;}
 });
}
function applyReadingStyles(){if(!view?.renderer)return;const s=state.settings,{background:bg,text:ink}=readingPalette(s.theme);
 view.renderer.setAttribute('flow','paginated');view.renderer.setAttribute('margin','16px');view.renderer.setAttribute('gap',String(Math.min(25,s.margin/2))+'%');view.renderer.setAttribute('max-column-count','1');view.renderer.setAttribute('max-inline-size','680px');
 view.renderer.setAttribute('manual-touch','');view.renderer.toggleAttribute('animated',s.pageAnimation&&!matchMedia('(prefers-reduced-motion: reduce)').matches);
 const font=selectedFont(s.fontFamily),align=selectedAlignment(s.textAlign);
 view.renderer.setStyles(`${fontFace(font,window.location.origin)}html{background:${bg}!important;color:${ink}!important;color-scheme:${s.theme==='night'?'dark':'light'}!important}html,body{touch-action:pan-y pinch-zoom}body{font-family:${fontFamily(font)}!important;font-size:${s.fontSize}px!important;line-height:${s.lineHeight}!important;text-align:${align}!important;padding:0!important;margin:0!important}p{margin:0 0 1em!important;text-align:${align}!important}body{color:${ink}!important;background:transparent!important}body :is(p,div,span,li,blockquote,h1,h2,h3,h4,h5,h6,em,strong,b,i,small,a,td,th,section,article){color:inherit!important;background-color:transparent!important}body :is(p,div,span,li,blockquote,h1,h2,h3,h4,h5,h6){font-family:inherit!important}li,blockquote{text-align:${align}!important}h1,h2{line-height:1.35!important;font-weight:500!important}h1{font-size:1.7em!important;margin:1em 0!important}img{max-width:100%!important}a{color:inherit}::selection{background:#b5c9a0;color:#14291f}`);scheduleUnderlines();
}
function scheduleUnderlines(){
 cancelAnimationFrame(underlineFrame);underlineFrame=requestAnimationFrame(()=>{
  if(!view?.renderer)return;
  const viewport=$('#reader-body').getBoundingClientRect();
  for(const content of view.renderer.getContents())underlineSavedWords(content,savedForms,{enabled:state.settings.savedUnderlines,night:state.settings.theme==='night',visible:view.lastLocation?.range,viewport});
 });
}
function refreshSavedForms(){
 const roots=[...new Set(state.words.map(w=>normalizeWord(w.word)))].sort(),signature=JSON.stringify(roots);
 if(signature===formsSignature){scheduleUnderlines();return;}
 formsSignature=signature;const token=++formsRequest;savedForms=new Map(roots.map(w=>[w,w]));scheduleUnderlines();
 if(!roots.length)return;
 call('wordForms',{words:roots}).then(rows=>{if(token!==formsRequest)return;for(const {form,lemma} of rows)if(!savedForms.has(form))savedForms.set(form,lemma);scheduleUnderlines();}).catch(e=>console.warn('词形读取失败，保留原词下划线',e));
}
async function turnPage(direction){
 if(!view?.renderer||pageTurning||!$('#sheet').hidden||!['next','prev'].includes(direction))return false;
 if(view.renderer.getContents().some(({doc})=>doc.getSelection()?.toString()))return false;
 if(direction==='next'?view.renderer.atEnd:view.renderer.atStart){toast(direction==='next'?'已经到全书结尾':'已经到全书开头');return false;}
 const reader=view;pageTurning=true;
 try{await reader[direction]();scheduleUnderlines();return true;}finally{pageTurning=false;}
}
function attachPageInput(surface,doc,index){
 let down=null;const pointers=new Set();let multi=false;
 surface.addEventListener('pointerdown',e=>{pointers.add(e.pointerId);if(pointers.size>1){multi=true;down=null;return;}multi=false;down={x:e.clientX,y:e.clientY,t:Date.now(),id:e.pointerId};});
 surface.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);down=null;});
 surface.addEventListener('pointerup',e=>{
  pointers.delete(e.pointerId);if(!down||multi||down.id!==e.pointerId)return;
  const direction=swipeDirection(e.clientX-down.x,e.clientY-down.y,Date.now()-down.t);
  if(direction){down=null;run(()=>turnPage(direction));}
 });
 surface.addEventListener('click',e=>{
  if(!down||multi||Date.now()-down.t>450||Math.abs(e.clientX-down.x)>12||Math.abs(e.clientY-down.y)>12)return;
  down=null;if(!$('#sheet').hidden)return;
  if(doc?.getSelection()?.toString()||e.target.closest?.('a,button,input,textarea,select,img,svg,video'))return;
  if(doc){
   const caret=doc.caretRangeFromPoint?.(e.clientX,e.clientY);
   if(caret?.startContainer.nodeType===3){const hit=wordAt(caret.startContainer.textContent,caret.startOffset);if(hit){
    const range=doc.createRange();range.setStart(caret.startContainer,hit.start);range.setEnd(caret.startContainer,hit.end);
    if([...range.getClientRects()].some(r=>e.clientX>=r.left-2&&e.clientX<=r.right+2&&e.clientY>=r.top-2&&e.clientY<=r.bottom+2)){
     e.preventDefault();const block=caret.startContainer.parentElement.closest('p,div,li,blockquote')||caret.startContainer.parentElement;
     showDictionary(hit.word,{sentence:sentenceAt(block.textContent,hit.word),bookId:current.id,bookTitle:current.title,chapter:view.book.toc?.find(x=>String(x.href)===String(index))?.label||location?.tocItem?.label||'',cfi:view.getCFI(index,range),compound:hit.compound});return;
    }
   }}
  }
  const bounds=$('#reader-body').getBoundingClientRect(),frame=doc?.defaultView.frameElement.getBoundingClientRect();
  const x=e.clientX+(frame?.left||0)-bounds.left,direction=edgeDirection(x,bounds.width);
  if(direction){e.preventDefault();run(()=>turnPage(direction));return;}
  setReaderControls(menuHidden);
 });
}
function attachReading(doc,index){doc.addEventListener('selectionchange',()=>syncReadingKeys());attachPageInput(doc,doc,index);scheduleUnderlines();}
function exitReader(){syncReadingKeys(false);stopAudio();save();if(view){view.close();view.remove();view=null;}current=null;location=null;$('#reading').hidden=true;$('#reader-header').hidden=false;$('#reader-footer').hidden=false;setReaderControls(false);readingChapters=[];render();}
$('#reader-back').onclick=exitReader;$('#previous').onclick=()=>run(()=>goChapter(-1));$('#next').onclick=()=>run(()=>goChapter(1));
$('#bookmark').onclick=()=>run(async()=>{if(!current||!location)return;current.bookmarks||=[];const i=current.bookmarks.findIndex(x=>x.cfi===location.cfi);if(i>=0){current.bookmarks.splice(i,1);toast('已移除书签');}else{current.bookmarks.push({cfi:location.cfi,progress:current.progress,title:location.tocItem?.label||'阅读位置',createdAt:Date.now()});toast('已添加书签');}$('#bookmark').textContent=i>=0?'☆':'★';await save();});
$('#toc').onclick=()=>{if(sheetKind==='reader-toc'&&!$('#sheet').hidden)closeSheet();else showTOC();};
function showTOC(){
 if(!view)return;
 openSheet('目录与书签',`<div class="dict-tabs"><button class="active" id="toc-tab">目录</button><button id="marks-tab">书签 · ${current.bookmarks?.length||0}</button></div><div id="navigation-list"></div>`,'reader-toc');
 const draw=(marks=false)=>{const list=marks?(current.bookmarks||[]):readingChapters,active=chapterIndex();$('#toc-tab').classList.toggle('active',!marks);$('#marks-tab').classList.toggle('active',marks);$('#navigation-list').innerHTML=list.length?list.map((x,i)=>`<button class="toc-item" data-nav="${i}" ${!marks&&i===active?'aria-current="location"':''} style="padding-left:${6+(x.depth||0)*14}px">${esc(marks?x.title+' · '+Math.round(x.progress*100)+'%':x.label)}</button>`).join(''):'<p class="sheet-note">这里还没有书签。</p>';document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>run(async()=>{const x=list[Number(b.dataset.nav)];closeSheet();await view.goTo(marks?x.cfi:x.href);setReaderControls(false);}));requestAnimationFrame(()=>$('#navigation-list [aria-current="location"]')?.scrollIntoView({block:'nearest'}));};$('#toc-tab').onclick=()=>draw();$('#marks-tab').onclick=()=>draw(true);draw();
}
function setReaderControls(show){menuHidden=!show;$('#reader-header').hidden=!show;$('#reader-footer').hidden=!show;$('#reader-status').hidden=show;}
function chapterIndex(){
 if(!readingChapters.length)return -1;
 const href=location?.tocItem?.href;
 const exact=href!==undefined?readingChapters.findIndex(c=>JSON.stringify(c.href)===JSON.stringify(href)):-1;
 if(exact>=0)return exact;
 const section=view?.renderer?.getContents()[0]?.index;
 const index=readingChapters.findLastIndex(c=>typeof c.section==='number'&&c.section<=section);return Math.max(0,index);
}
function updateReaderProgress(){
 if(!current)return;const progress=percent(current),index=chapterIndex(),title=readingChapters[index]?.label||location?.tocItem?.label||current.title;
 $('#reader-current-chapter').textContent=title;$('#reader-status-chapter').textContent=title;$('#reader-status-progress').textContent=progress+'%';
 if(!progressDragging){$('#progress-label').textContent=progress+'%';$('#reader-progress').value=String(Math.min(100,Math.max(0,(current.progress||0)*100)));}
 $('#previous').disabled=index<=0;$('#next').disabled=index<0||index>=readingChapters.length-1;
}
async function goChapter(direction){
 if(!view||pageTurning)return;const index=chapterIndex()+direction;if(index<0||index>=readingChapters.length)return;
 pageTurning=true;try{await view.goTo(readingChapters[index].href);setReaderControls(false);}finally{pageTurning=false;}
}
function updateModeButton(){const night=state.settings.theme==='night';$('#reader-mode .reader-action-icon').innerHTML=readerIcons[night?'sun':'moon'];$('#reader-mode-label').textContent=night?'日间':'夜间';$('#reader-mode').setAttribute('aria-label',night?'切换到日间模式':'切换到夜间模式');}
function updateReaderAction(){for(const [id,kind] of [['toc','reader-toc'],['reader-menu','reader-settings']])$('#'+id).setAttribute('aria-expanded',String(sheetKind===kind));}
$('#toc .reader-action-icon').innerHTML=readerIcons.toc;$('#reader-menu .reader-action-icon').innerHTML=readerIcons.settings;
$('#reader-status').onclick=()=>setReaderControls(true);
$('#reader-mode').onclick=()=>{if(state.settings.theme==='night')state.settings.theme=['paper','white'].includes(state.settings.dayTheme)?state.settings.dayTheme:'paper';else{state.settings.dayTheme=state.settings.theme;state.settings.theme='night';}applyTheme();applyReadingStyles();if(sheetKind==='reader-settings')document.querySelectorAll('[data-theme]').forEach(b=>b.classList.toggle('selected',b.dataset.theme===state.settings.theme));scheduleSave();};
$('#reader-progress').oninput=()=>{progressDragging=true;$('#progress-label').textContent='预览 '+Number($('#reader-progress').value).toFixed(1)+'%';};
$('#reader-progress').onchange=()=>run(async()=>{const fraction=Number($('#reader-progress').value)/100;progressDragging=false;if(!view)return;await view.goToFraction(fraction);updateReaderProgress();});
$('#reader-progress').onpointercancel=()=>{progressDragging=false;updateReaderProgress();};
function applyBrightness(){if(native)window.Android.setAppBrightness?.(brightnessValue(state.settings));}
$('#progress-label').onclick=()=>{openSheet('跳转进度',`<div class="range-row"><label id="jump-label">${percent(current)}%</label><input id="jump" type="range" min="0" max="100" value="${percent(current)}" aria-label="阅读进度"></div><button class="primary wide" id="go-progress">跳转</button>`);$('#jump').oninput=()=>$('#jump-label').textContent=$('#jump').value+'%';$('#go-progress').onclick=()=>run(async()=>{const value=Number($('#jump').value)/100;closeSheet();await view.goToFraction(value);});};
function canUseReadingKeys(){
 const selected=view?.renderer?.getContents().some(({doc})=>doc.getSelection()?.toString());
 return !!(current&&view?.renderer?.getContents().length&&$('#sheet').hidden&&state.settings.volumeKeys&&!selected&&!document.hidden);
}
function syncReadingKeys(enabled=canUseReadingKeys()){
 if(native)window.Android.setReadingKeysEnabled?.(enabled);
}
window.appSyncReadingKeys=()=>syncReadingKeys();
window.appVolumePage=async direction=>{
 if(!canUseReadingKeys())return false;
 try{return await turnPage(direction);}catch(e){toast('翻页失败：'+e.message);return false;}
};
function readerSettings(){
 const s=state.settings;
 openSheet('阅读设置',`<div class="brightness-control"><div><label for="reading-brightness">亮度</label><label class="brightness-follow"><input type="checkbox" id="brightness-system" ${s.brightnessMode!=='manual'?'checked':''}> 跟随系统</label></div><input id="reading-brightness" aria-label="阅读亮度" type="range" min="5" max="100" value="${Math.round(brightnessValue({...s,brightnessMode:'manual'})*100)}"><output id="brightness-value">${s.brightnessMode==='manual'?Math.round(brightnessValue(s)*100)+'%':'跟随系统'}</output></div><label class="form-label" for="reading-font">英文字体</label>${fontPickerHTML()}
 <div class="range-row font-size-row"><label>字号</label><button id="font-smaller" aria-label="减小字号">A−</button><input id="font-size" aria-label="字号" type="range" min="14" max="32" value="${s.fontSize}"><span id="font-value">${s.fontSize}</span><button id="font-larger" aria-label="增大字号">A＋</button></div><details id="reading-more"><summary>更多设置 · 行距、对齐与翻页</summary><div class="range-row"><label>行距</label><input id="line-height" aria-label="行距" type="range" min="1.3" max="2.4" step="0.05" value="${s.lineHeight}"></div><div class="range-row"><label>页边距</label><input id="page-margin" aria-label="页边距" type="range" min="12" max="40" step="2" value="${s.margin}"></div>
 <p class="form-label" id="alignment-label">正文对齐</p><div class="alignment-options" role="group" aria-labelledby="alignment-label">${alignments.map(([id,label])=>`<button data-align="${id}" aria-pressed="${selectedAlignment(s.textAlign)===id}">${label}</button>`).join('')}</div>
 <label class="volume-setting"><span>音量键翻页<small>音量减：下一页 · 音量加：上一页</small></span><input type="checkbox" id="volume-keys" ${s.volumeKeys?'checked':''}></label>
 <label class="volume-setting"><span>翻页动画<small>短暂的滑动过渡，跨章节平滑衔接</small></span><input type="checkbox" id="page-animation" ${s.pageAnimation?'checked':''}></label>
 <label class="volume-setting"><span>收藏词下划线<small>标记已收藏单词及词典确认的常见变形</small></span><input type="checkbox" id="saved-underlines" ${s.savedUnderlines?'checked':''}></label>
 </details><p class="form-label">阅读背景</p><div class="theme-options">${[['paper','纸张','#f6f4ed','#000'],['white','明亮','#fff','#000'],['night','夜间','#000','#fff']].map(([id,label,bg,color])=>`<button data-theme="${id}" class="${s.theme===id?'selected':''}" style="background:${bg};color:${color}">${label}</button>`).join('')}</div><p class="sheet-note" style="margin-top:14px">轻点左右空白页边或轻扫翻页 · 单击单词查词</p>`,current?'reader-settings':'generic');
 mountFontPicker(s,()=>{applyReadingStyles();scheduleSave();});
 const update=()=>{s.fontSize=Number($('#font-size').value);s.lineHeight=Number($('#line-height').value);s.margin=Number($('#page-margin').value);$('#font-value').textContent=s.fontSize;applyReadingStyles();scheduleSave();};
 $('#font-smaller').onclick=()=>{const input=$('#font-size');input.value=Math.max(14,Number(input.value)-1);update();};$('#font-larger').onclick=()=>{const input=$('#font-size');input.value=Math.min(32,Number(input.value)+1);update();};
 $('#reading-brightness').oninput=()=>{s.brightnessMode='manual';s.brightnessLevel=Number($('#reading-brightness').value);$('#brightness-system').checked=false;$('#brightness-value').textContent=s.brightnessLevel+'%';applyBrightness();scheduleSave();};
 $('#brightness-system').onchange=()=>{s.brightnessMode=$('#brightness-system').checked?'system':'manual';$('#brightness-value').textContent=s.brightnessMode==='system'?'跟随系统':Math.round(brightnessValue(s)*100)+'%';applyBrightness();scheduleSave();};
 ['#font-size','#line-height','#page-margin'].forEach(selector=>$(selector).oninput=update);
 document.querySelectorAll('[data-align]').forEach(b=>b.onclick=()=>{s.textAlign=b.dataset.align;document.querySelectorAll('[data-align]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));applyReadingStyles();scheduleSave();});
 for(const [id,key] of [['page-animation','pageAnimation'],['saved-underlines','savedUnderlines']])$('#'+id).onchange=()=>{s[key]=$('#'+id).checked;applyReadingStyles();scheduleSave();};
 $('#volume-keys').onchange=()=>{s.volumeKeys=$('#volume-keys').checked;syncReadingKeys();scheduleSave();};
 document.querySelectorAll('[data-theme]').forEach(b=>b.onclick=()=>{s.theme=b.dataset.theme;if(s.theme!=='night')s.dayTheme=s.theme;applyTheme();applyReadingStyles();document.querySelectorAll('[data-theme]').forEach(x=>x.classList.toggle('selected',x===b));scheduleSave();});
}
$('#reader-menu').onclick=()=>{if(sheetKind==='reader-settings'&&!$('#sheet').hidden)closeSheet();else readerSettings();};
const voiceReady=new Promise(resolve=>window.meSpeak.loadVoice('/vendor/mespeak/en-us.json',(ok)=>resolve(ok)));
function setAudioState(value,source=''){
 const button=audioButton;if(!button?.isConnected)return;
 const label=button.dataset.audioLabel||(button.dataset.audioLabel=button.getAttribute('aria-label')||'播放美音');
 button.dataset.state=value;if(source)button.dataset.source=source;else if(value==='loading')delete button.dataset.source;
 button.setAttribute('aria-busy',String(value==='loading'));
 button.setAttribute('aria-label',value==='playing'?'正在播放美音':value==='loading'?'正在准备美音':label);
}
async function pronounce(word,button=$('#play-word')){
 stopAudio();audioButton=button;const token=audioVersion;setAudioState('loading');
 const finish=()=>{if(token===audioVersion)setAudioState('idle');};
 const synth=async()=>{
  if(token!==audioVersion)return;
  if(!await voiceReady)throw Error('离线合成资源加载失败');
  if(token!==audioVersion)return;
  setAudioState('playing','离线合成美音');
  window.meSpeak.speak(word,{voice:'en/en-us',speed:155,amplitude:90},ok=>{if(token!==audioVersion)return;finish();if(!ok)toast('发音失败，请重试');});
 };
 try{
  const audio=await call('pronounce',{word});if(token!==audioVersion)return;
  if(audio){
   const clip=new Audio(audio.url);playing=clip;
   clip.onended=finish;clip.onerror=()=>{if(token===audioVersion)synth().catch(error=>{finish();toast(error.message);});};
   await clip.play();if(token===audioVersion)setAudioState('playing',audio.label);
  }else await synth();
 }catch(e){try{await synth();}catch(error){finish();toast(error.message);}}
}
const speakerIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>';
const starIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3L3 9.6l6.2-.9L12 3Z"/></svg>';
function dictionaryHeader(e,saved,missing=false){return `<div class="sheet-head dict-head"><div class="dict-title"><h2 id="sheet-title" class="dict-heading">${esc(e.word)}</h2><div class="phonetic">${e.phonetic?'/'+esc(e.phonetic)+'/':''}${e.queried&&e.queried!==e.word?' · '+esc(e.queried)+' 的原形':''}</div></div><div class="dict-actions"><button class="dict-icon" id="play-word" aria-label="播放美音">${speakerIcon}</button>${missing?'':`<button class="dict-icon" id="save-word" aria-label="${saved?'取消收藏':'收藏单词'}" aria-pressed="${saved}">${starIcon}</button>`}<button class="dict-icon sheet-close" aria-label="关闭">×</button></div></div>`;}
function dictionaryContext(e){return e.sentence?`<section class="context-card" aria-label="原文句子"><div class="context-label">原句</div><div id="dict-context">${highlightContext(e.sentence,e.queried||e.word)}</div>${e.bookTitle||e.chapter?`<div class="source">${esc([e.bookTitle,e.chapter].filter(Boolean).join(' · '))}</div>`:''}</section>`:'';}
function safeURL(value){try{const u=new URL(value);return u.protocol==='https:'?u.href:'#';}catch{return '#';}}
async function showDictionary(raw,context={}){
 openSheet('单词',`<p class="sheet-note">正在查询本地词典…</p>`,'dictionary');const version=++queryVersion;
 await run(async()=>{
 const entry=await call('lookup',{word:normalizeWord(raw)});if(version!==queryVersion)return;
 if(!entry){const e={...context,word:raw,queried:context.queried||raw};$('#sheet').innerHTML=dictionaryHeader(e,false,true)+dictionaryContext(e)+compoundAction(e)+'<p class="sheet-note">离线词典暂未收录这个单词。人名、拼写变化或特殊词汇可能没有对应释义。</p>';$('#sheet .sheet-close').onclick=closeSheet;$('#play-word').onclick=()=>pronounce(normalizeWord(raw));wireCompound(e);return;}
 activeWord={...entry,...(encounterOf(context)||{}),compound:context.compound,queried:context.queried||entry.queried||raw};drawDictionary();
 });
}
function vocabularyAPI(){return {state,save,openSheet,closeSheet,run,speakerIcon};}
function savedContext(w){return encountersOf(w)[0]||{queried:w.queried||w.word};}
function compoundAction(e){return e.compound&&e.compound!==e.queried?`<button class="compound-query" id="query-compound">查询完整词：${esc(e.compound)}</button>`:'';}
function wireCompound(e){if($('#query-compound'))$('#query-compound').onclick=()=>showDictionary(e.compound,{...e,queried:e.compound,compound:null});}
function dictionaryRecords(e){
 const word=state.words.find(w=>w.word===e.word);
 const selected=encounterOf(e),others=(word?encountersOf(word):[]).filter(x=>!selected||encounterKey(x)!==encounterKey(selected));
 return `<div class="dictionary-organize"><button class="secondary" id="dict-edit-tags" ${word?'':'disabled'}>设置标签${word?.tags.length?' · '+esc(word.tags.join('、')):''}</button></div>${others.length?`<details class="encounter-history"><summary>其他遇见记录 · ${others.length}</summary>${others.map((x,i)=>`<article class="encounter-item">${x.sentence?`<p>${highlightContext(x.sentence,x.queried||word.word)}</p>`:''}<button class="source" data-encounter-source="${i}">${esc(sourceName(x,state.books))}${x.chapter?' · '+esc(x.chapter):''} ↗</button></article>`).join('')}</details>`:''}${selected?.bookId?'<button class="source dict-return-source" id="dict-return-source">返回这次遇见的原文 ↗</button>':''}`;
}
function wireDictionaryRecords(e){
 const word=state.words.find(w=>w.word===e.word);
 if(word)$('#dict-edit-tags').onclick=()=>editWordTags(vocabularyAPI(),[word.word],{replace:true,onDone:()=>showDictionary(e.word,e)});
 const selected=encounterOf(e),others=(word?encountersOf(word):[]).filter(x=>!selected||encounterKey(x)!==encounterKey(selected));
 const jump=x=>{if(!x?.bookId||!state.books.some(b=>b.id===x.bookId)){toast('原书已不在书架，收藏的原句仍保留');return;}closeSheet();openReader(x.bookId,x.cfi);};
 document.querySelectorAll('[data-encounter-source]').forEach(b=>b.onclick=()=>jump(others[Number(b.dataset.encounterSource)]));
 if($('#dict-return-source'))$('#dict-return-source').onclick=()=>jump(selected);
}
function drawDictionary(){
 const e=activeWord,existing=state.words.find(x=>x.word===e.word),saved=!!existing&&hasEncounter(existing,e);
 $('#sheet').innerHTML=dictionaryHeader(e,saved)+dictionaryContext(e)+compoundAction(e)+`<div class="dict-tabs"><button id="dict-zh" class="${state.settings.dictionary==='zh'?'active':''}">英汉</button><button id="dict-en" class="${state.settings.dictionary==='en'?'active':''}">英英</button></div><div id="dict-meaning" tabindex="0" aria-label="单词释义"></div><div id="dict-records">${dictionaryRecords(e)}</div>`;
 $('#sheet .sheet-close').onclick=closeSheet;$('#play-word').onclick=()=>pronounce(e.word);
 if(existing&&!saved)$('#save-word').setAttribute('aria-label','收藏这条新原句');
 const showMeaning=()=>{$('#dict-meaning').textContent=e[state.settings.dictionary]||'此词暂无'+(state.settings.dictionary==='en'?'英文':'中文')+'释义，可切换另一种词典。';$('#dict-zh').classList.toggle('active',state.settings.dictionary==='zh');$('#dict-en').classList.toggle('active',state.settings.dictionary==='en');};
 $('#dict-zh').onclick=()=>{state.settings.dictionary='zh';scheduleSave();showMeaning();};$('#dict-en').onclick=()=>{state.settings.dictionary='en';scheduleSave();showMeaning();};showMeaning();wireDictionaryRecords(e);wireCompound(e);
 $('#save-word').onclick=()=>run(async()=>{
  const button=$('#save-word'),word=state.words.find(x=>x.word===e.word),saved=!!word&&hasEncounter(word,e);
  const remove=async()=>{state.words=state.words.filter(x=>x.word!==e.word);await save();};
  if(saved&&encountersOf(word).length>1){
   openSheet('取消收藏这个单词？',`<p class="sheet-note">将移除 ${esc(e.word)} 和 ${encountersOf(word).length} 条遇见记录。</p><button class="primary wide" id="confirm-dict-remove">确认取消收藏</button><button class="secondary wide" id="keep-dict-word">保留收藏</button>`);
   $('#confirm-dict-remove').onclick=()=>run(async()=>{await remove();showDictionary(e.word,e);});$('#keep-dict-word').onclick=()=>showDictionary(e.word,e);return;
  }
  button.disabled=true;try{if(saved)await remove();else{collectWord(state.words,{...e,meaning:e[state.settings.dictionary]||e.zh||e.en});await save();}}finally{button.disabled=false;}
  if(sheetKind!=='dictionary'||activeWord!==e||!button.isConnected)return;
  button.setAttribute('aria-pressed',String(!saved));button.setAttribute('aria-label',saved?'收藏单词':'取消收藏');
  $('#dict-records').innerHTML=dictionaryRecords(e);wireDictionaryRecords(e);
 });
}
function words(){refreshVocabulary=mountVocabulary({...vocabularyAPI(),openWord:w=>showDictionary(w.word,savedContext(w)),playWord:(w,button)=>pronounce(w.word,button)});}
function settings(){
 $('#main').innerHTML=`<section class="intro"><span class="eyebrow">MAKE ROOM FOR READING</span><h1>让阅读，合你心意。</h1><p>无需账号，你的故事和单词都在本地。</p></section><h2>阅读偏好</h2><div class="settings-group"><div class="setting-row"><div>默认释义<small>阅读时也可以随时切换</small></div><select id="default-dict" aria-label="默认释义"><option value="zh">英汉</option><option value="en">英英</option></select></div><button class="setting-row" id="reading-preferences"><div>字体与背景<small>字体、对齐、音量键翻页与阅读背景</small></div><span>›</span></button><div class="setting-row"><div>翻页方式<small>左右滑动翻页，轻点单词查词</small></div><span class="muted">左右翻页</span></div></div><h2>发音与存储</h2><div class="settings-group"><div class="setting-row"><div>美音优先<small>真人缓存 → 联网真人 → 内置离线合成<br>未缓存的词断网时使用合成，合成引擎随安装包提供</small></div><span>🇺🇸</span></div><button class="setting-row" id="clear-cache"><div>清理在线发音缓存<small id="cache-size">正在读取… · 上限 50 MB</small></div><span>›</span></button><div class="setting-row"><div>内置离线资源<small id="resource-info">正在读取…</small></div><span class="pill">已内置</span></div></div><h2>数据与备份</h2><div class="settings-group"><button class="setting-row" id="backup"><div>导出备份<small>阅读进度、生词、设置，可包含书籍</small></div><span>↗</span></button><button class="setting-row" id="restore"><div>恢复备份<small>从本地 ZIP 备份恢复数据</small></div><span>↙</span></button><button class="setting-row" id="licenses"><div>关于与开源资源<small>叶读 Leaf 0.1.13 · 查看资源许可与发音署名</small></div><span>›</span></button></div><p class="sheet-note">书籍与生词仅保存在当前设备。卸载前请先导出备份。联网查发音时只发送所查单词，不上传书籍或原句。</p>`;
 $('#default-dict').value=state.settings.dictionary;$('#default-dict').onchange=()=>{state.settings.dictionary=$('#default-dict').value;save();};$('#reading-preferences').onclick=readerSettings;
 run(async()=>{const info=await call('cacheInfo');if($('#cache-size'))$('#cache-size').textContent=(info.bytes/1024/1024).toFixed(1)+' MB · 上限 50 MB';const stats=await call('stats');if($('#resource-info'))$('#resource-info').textContent=stats.dictionaryEntries.toLocaleString()+' 个词条 · 内置美音合成';});
 $('#clear-cache').onclick=()=>run(async()=>{stopAudio();await call('clearCache');toast('发音缓存已清理，内置资源保留');settings();});
 $('#backup').onclick=()=>{openSheet('导出本地备份',`<p class="sheet-note">备份包含阅读进度、书签、生词与设置。建议一起保存书籍，方便换手机后恢复阅读。</p><label class="setting-row"><span>包含书籍文件</span><input type="checkbox" id="include-books" checked></label><button class="primary wide" id="do-backup" style="margin-top:18px">选择位置并导出</button>`);$('#do-backup').onclick=()=>run(async()=>{const b=$('#do-backup');b.disabled=true;try{await save();const result=await call('backup',{state,includeBooks:$('#include-books').checked});if(result){closeSheet();toast('备份已导出');}}finally{b.disabled=false;}});};
 $('#restore').onclick=()=>{openSheet('从备份恢复',`<p class="sheet-note">恢复将替换当前的书架记录、生词、阅读进度和设置。建议先导出当前数据。未包含书籍文件的备份，在新设备上需要重新导入原书。</p><button class="primary wide" id="do-restore">选择备份并恢复</button>`);$('#do-restore').onclick=()=>run(async()=>{const b=$('#do-restore');b.disabled=true;try{clearTimeout(saveTimer);await save();restoring=true;await saveChain.catch(()=>{});const result=await call('restore');if(result){state=migrateVocabularyState(validateState(await call('loadState')));state.settings={...defaults,...state.settings};applyBrightness();closeSheet();render();toast('备份恢复完成');}}finally{restoring=false;b.disabled=false;}});};$('#licenses').onclick=showLicenses;
}
async function showLicenses(){openSheet('关于叶读与资源许可',`<p class="sheet-note">叶读 Leaf 0.1.13<br>Android 本地英文阅读器 · 无账号 · 无广告</p><p class="sheet-note">内置字体：Noto、Liberation（SIL OFL 1.1）、DejaVu（Bitstream Vera / 公有领域），许可随安装包保留。<br>阅读引擎：Foliate.js（MIT）<br>双语词典：ECDICT（上游 MIT 声明，释义与音标来自其词库；音标不保证是美音）<br>离线合成：meSpeak / eSpeak（GPL-3.0）<br>网页提取：Mozilla Readability（Apache-2.0）<br>解压：zip.js（BSD-3-Clause）、fflate（MIT）<br>App 源码：GPL-3.0，分发时保留完整许可与对应源代码。</p><p class="sheet-note">安装包不附带真人录音。联网时按单词从 Wikimedia Commons 获取许可与署名完整的美音录音，原样缓存；没有可用录音时使用内置离线合成。缓存录音的作者、来源与许可可在下方查看。</p><button class="secondary wide" id="credits-toggle">查看真人录音署名</button><div id="recording-credits" class="license-text" hidden></div>`);$('#credits-toggle').onclick=()=>run(async()=>{const box=$('#recording-credits');if(!box.hidden){box.hidden=true;return;}box.hidden=false;box.textContent='正在读取…';const data=await call('licenses');box.replaceChildren();if(!Object.keys({...data.recordings,...data.cached}).length)box.textContent='暂无已缓存的真人录音';for(const [word,m] of Object.entries({...data.recordings,...data.cached})){const p=document.createElement('p');p.append(document.createTextNode(word+' — '+m.author+' — '+m.license+' '));const link=document.createElement('a');link.href=safeURL(m.source);link.textContent='来源';link.target='_blank';link.rel='noopener';p.append(link);if(m.licenseUrl){const license=document.createElement('a');license.href=safeURL(m.licenseUrl.replace(/^http:\/\/creativecommons\.org\//,'https://creativecommons.org/'));license.textContent=' · 许可';license.target='_blank';license.rel='noopener';p.append(license);}if(m.changes)p.append(document.createTextNode(' · '+m.changes));box.append(p);}});}
async function firstRun(){const text=`Chapter One — An Open Window\n\nMara opened the window and listened. Beyond the quiet garden, a bird was singing. She had lived on this street for years, but this morning everything seemed a little different.\n\nOn her desk lay a small green book. Inside its cover, someone had written a simple message: Every journey begins with a moment of curiosity.\n\nShe smiled and turned the page. There was no hurry. The world outside could wait for a little while.\n\nChapter Two — The Garden Path\n\nAfter breakfast, Mara walked into the garden. The grass was wet, and the air smelled of rain. A narrow path led toward an old wooden gate.\n\nShe noticed a tiny flower beside the path. Its petals were almost transparent in the morning light. She had walked past this place a hundred times without seeing it.\n\nPerhaps adventure did not always begin in a distant country. Perhaps it began with paying attention.\n\nChapter Three — A Familiar Voice\n\nAt the gate stood her neighbour, holding a basket of apples. He offered her one and asked about the book.\n\nIt is a story about noticing things, she said. Beautiful things, ordinary things, and things we have forgotten to see.\n\nThe old man nodded. Then you have already started reading it, he replied.\n\nChapter Four — The Long Way Home\n\nMara decided to take the long way home. She followed the river, watching the sunlight move across the water. The familiar town seemed full of unexpected possibilities.\n\nThat evening, she returned to her desk and wrote one sentence in her notebook: Today I learned that a quiet life can still be full of discovery.\n\nThen she opened her book again.`;
 const result=await call('saveText',{name:'The Quiet Art of Noticing',text});await addFile(result,{title:'The Quiet Art of Noticing',author:'A Leaf Original',demo:true});}
async function init(){try{const saved=await call('loadState');if(saved){state=migrateVocabularyState(validateState(saved));state.settings={...defaults,...state.settings};}else await firstRun();render();applyBrightness();scheduleDailyPhrase();refreshSavedForms();}catch(e){console.error(e);$('#main').innerHTML=`<div class="empty"><h2>暂时无法打开本地数据</h2><p>${esc(e.message)}</p><button class="secondary" id="retry-init">重试</button></div>`;$('#retry-init').onclick=init;}}
window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.hidden)save();else scheduleDailyPhrase();syncReadingKeys();});window.addEventListener('focus',scheduleDailyPhrase);init();
