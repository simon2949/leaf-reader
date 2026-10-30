import {escapeHTML as esc,highlightContext} from './core.js';
import {uniqueTags,cleanTag,encountersOf,sourceName,bookFilters,filterWords,shortMeaning,changeTags} from './vocabulary.js';
const $=s=>document.querySelector(s);
const tagIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 13 13 20a2 2 0 0 1-3 0l-7-7V4h9l8 6a2 2 0 0 1 0 3Z"/><circle cx="7.5" cy="8" r="1"/></svg>';
// Keep the selection model local; use the app's sheet rather than Android's native select dialog.
function mountFilterPicker(id,title,{openSheet,closeSheet},onChange){
 const select=$('#'+id),trigger=document.createElement('button');
 trigger.type='button';trigger.id=id+'-trigger';trigger.className='vocab-filter-trigger';
 trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-label',title);
 select.hidden=true;select.before(trigger);
 const sync=()=>{trigger.innerHTML=`<span>${esc(select.selectedOptions[0]?.textContent||'')}</span><span class="filter-chevron" aria-hidden="true">⌄</span>`;trigger.classList.toggle('filter-active',!!select.value&&select.value!=='recent');};
 trigger.onclick=()=>{
  const options=[...select.options];
  openSheet(title,`${options.length>7?'<label class="search filter-search"><span aria-hidden="true">⌕</span><input id="filter-search" placeholder="搜索选项" aria-label="搜索筛选选项"></label>':''}<div class="filter-options" role="group" aria-label="${esc(title)}"></div>`,'vocabulary-filter');
  const draw=()=>{const query=$('#filter-search')?.value.trim().toLocaleLowerCase()||'';const visible=options.filter(o=>o.textContent.toLocaleLowerCase().includes(query));$('.filter-options').innerHTML=visible.length?visible.map(o=>`<button class="filter-option" data-filter-value="${esc(o.value)}" aria-pressed="${o.value===select.value}"><span>${esc(o.textContent)}</span><span class="filter-check" aria-hidden="true">✓</span></button>`).join(''):'<p class="sheet-note filter-empty">没有匹配的选项</p>';
   document.querySelectorAll('[data-filter-value]').forEach(b=>b.onclick=()=>{select.value=b.dataset.filterValue;sync();closeSheet();onChange();});
  };draw();if($('#filter-search'))$('#filter-search').oninput=draw;
 };
 sync();return sync;
}
// Shared tag editor is used by both the list and dictionary sheet.
export function editWordTags({state,save,openSheet,closeSheet,run},keys,{remove=false,onDone=()=>{},replace=false}={}){
 const chosen=state.words.filter(w=>keys.includes(w.word));if(!chosen.length)return;
 const initial=replace?new Set(chosen[0].tags):new Set();
 openSheet(replace?'设置标签':remove?'批量移除标签':'批量添加标签',`<p class="sheet-note">${replace?esc(chosen[0].word):'已选 '+chosen.length+' 个单词'}${remove?' · 只移除标签，保留单词':''}</p><div id="tag-options"></div>${remove?'':`<div class="tag-create"><input class="text-input" id="new-tag" maxlength="24" aria-label="新标签名称" placeholder="新标签，例如：日常表达"><button class="secondary" id="create-tag">新建</button></div>`}<button class="primary wide" id="apply-tags">保存</button>`,'tags');
 const draw=()=>{$('#tag-options').innerHTML=state.wordTags.length?state.wordTags.map((tag,i)=>`<label class="tag-choice"><input type="checkbox" data-tag-index="${i}" ${initial.has(tag)?'checked':''}><span>${esc(tag)}</span></label>`).join(''):'<p class="sheet-note">还没有标签，可以先新建一个。</p>';document.querySelectorAll('[data-tag-index]').forEach(input=>input.onchange=()=>{const tag=state.wordTags[Number(input.dataset.tagIndex)];input.checked?initial.add(tag):initial.delete(tag);});};draw();
 if(!remove)$('#create-tag').onclick=()=>run(async()=>{const tag=cleanTag($('#new-tag').value);if(!tag){$('#new-tag').focus();return;}state.wordTags=uniqueTags([...state.wordTags,tag]);initial.add(tag);$('#new-tag').value='';draw();await save();});
 $('#apply-tags').onclick=()=>run(async()=>{const button=$('#apply-tags');button.disabled=true;try{if(replace)chosen[0].tags=[...initial];else changeTags(state.words,keys,[...initial],remove);await save();closeSheet();onDone();}finally{button.disabled=false;}});
}
export function mountVocabulary(api){
 const {state,save,openSheet,closeSheet,run,openWord,playWord}=api;
 let selecting=false,selected=new Set(),visible=[],longPress=null,suppressClick=false;
 $('#main').innerHTML=`<div class="vocab-heading"><div><p id="vocab-total">${state.words.length} 个单词</p></div><div><button class="vocab-text-button" id="manage-tags">标签</button><button class="vocab-text-button" id="organize-words">整理</button></div></div><label class="search"><span class="muted">⌕</span><input id="word-search" placeholder="搜索单词、释义、标签或原句" aria-label="搜索收藏单词"></label><div class="vocab-filters"><label>书籍<select id="word-book" aria-label="按书籍筛选"><option value="">全部书籍</option>${bookFilters(state.words,state.books).map(([id,title])=>`<option value="${esc(id)}">${esc(title)}</option>`).join('')}<option value="none">无书籍来源</option></select></label><label>标签<select id="word-tag" aria-label="按标签筛选"></select></label><label>排序<select id="word-sort" aria-label="单词排序"><option value="recent">最近收藏</option><option value="az">字母顺序</option></select></label></div><div class="vocab-display"><span id="word-results" aria-live="polite"></span><label><input type="checkbox" id="show-word-context" ${state.settings.vocabShowContext?'checked':''}> 展开原句</label></div><div id="word-bulk" hidden></div><div id="word-list"></div>`;
 function refreshTags(){const value=$('#word-tag').value;$('#word-tag').innerHTML='<option value="">全部标签</option><option value="__untagged">未分类</option>'+state.wordTags.map(t=>`<option value="tag:${esc(t)}">${esc(t)}</option>`).join('');if([...$('#word-tag').options].some(o=>o.value===value))$('#word-tag').value=value;syncTag?.();}
 let syncTag;refreshTags();
 mountFilterPicker('word-book','选择书籍',api,()=>{selected.clear();draw();});
 syncTag=mountFilterPicker('word-tag','选择标签',api,()=>{selected.clear();draw();});
 mountFilterPicker('word-sort','排序方式',api,draw);
 function enterSelection(key){selecting=true;if(key)selected.add(key);draw();}
 function draw(){
  visible=filterWords(state.words,{query:$('#word-search').value,book:$('#word-book').value,tag:$('#word-tag').value,sort:$('#word-sort').value});
  const existing=new Set(state.words.map(w=>w.word));selected=new Set([...selected].filter(key=>existing.has(key)));
  $('#vocab-total').textContent=state.words.length+' 个单词';$('#word-results').textContent=visible.length+' / '+state.words.length+' 个单词';$('#organize-words').textContent=selecting?'完成':'整理';
  const bulk=$('#word-bulk');bulk.hidden=!selecting;bulk.innerHTML=`<div class="bulk-count"><strong>已选 ${selected.size} 个</strong><button id="word-select-all">${visible.length&&visible.every(w=>selected.has(w.word))?'取消全选':'全选当前结果'}</button></div><div class="bulk-buttons"><button id="bulk-add-tags" ${selected.size?'':'disabled'}>添加标签</button><button id="bulk-remove-tags" ${selected.size?'':'disabled'}>移除标签</button><button id="bulk-delete" class="danger" ${selected.size?'':'disabled'}>取消收藏</button></div>`;
  $('#word-list').innerHTML=visible.length?visible.map(w=>{
   const contexts=encountersOf(w),first=contexts[0],sources=[...new Set(contexts.map(e=>sourceName(e,state.books)))];
   return `<article class="word-card compact-word ${selected.has(w.word)?'word-selected':''}" data-card="${esc(w.word)}"><div class="word-top">${selecting?`<input type="checkbox" data-select="${esc(w.word)}" aria-label="选择 ${esc(w.word)}" ${selected.has(w.word)?'checked':''}>`:''}<button class="word-open" data-word="${esc(w.word)}"><h2>${esc(w.word)}</h2></button><button class="dict-icon" data-audio="${esc(w.word)}" aria-label="播放 ${esc(w.word)} 的读音">${api.speakerIcon}</button>${selecting?'':`<button class="word-more" data-word-menu="${esc(w.word)}" aria-label="管理 ${esc(w.word)}">⋯</button>`}</div>${w.phonetic?`<div class="phonetic">/${esc(w.phonetic)}/</div>`:''}<p class="word-brief">${esc(shortMeaning(w))}</p>${w.tags.length?`<div class="word-tags">${w.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div>`:''}${state.settings.vocabShowContext&&first?.sentence?`<blockquote class="quote">${highlightContext(first.sentence,first.queried||w.word)}</blockquote>`:''}<div class="word-footer"><div class="word-origin">${esc(sources.join(' · ')||'无书籍来源')}${contexts.length>1?' · '+contexts.length+' 条遇见记录':''}</div>${selecting?'':`<button type="button" class="word-tag-add" data-word-tags="${esc(w.word)}" aria-label="为 ${esc(w.word)} 设置标签">${tagIcon}<span>＋ 标签</span></button>`}</div></article>`;
  }).join(''):`<div class="empty"><div class="empty-icon">☆</div><h3>${state.words.length?'没有符合条件的单词':'还没有收藏单词'}</h3><p>${state.words.length?'试试调整书籍、标签或搜索内容。':'阅读时轻点单词，再点星标收藏。'}</p></div>`;
  document.querySelectorAll('[data-word]').forEach(b=>b.onclick=()=>{if(suppressClick){suppressClick=false;return;}const w=state.words.find(w=>w.word===b.dataset.word);if(selecting){selected.has(w.word)?selected.delete(w.word):selected.add(w.word);draw();}else openWord(w);});
  document.querySelectorAll('[data-audio]').forEach(b=>b.onclick=()=>{const w=state.words.find(w=>w.word===b.dataset.audio);playWord(w,b);});
  document.querySelectorAll('[data-select]').forEach(b=>b.onchange=()=>{b.checked?selected.add(b.dataset.select):selected.delete(b.dataset.select);draw();});
  document.querySelectorAll('[data-word-tags]').forEach(b=>b.onclick=()=>editWordTags(api,[b.dataset.wordTags],{replace:true,onDone:()=>{refreshTags();draw();$('[data-word-tags="'+CSS.escape(b.dataset.wordTags)+'"]')?.focus({preventScroll:true});}}));
  document.querySelectorAll('[data-word-menu]').forEach(b=>b.onclick=()=>wordMenu(state.words.find(w=>w.word===b.dataset.wordMenu)));
  document.querySelectorAll('[data-card]').forEach(card=>{
   let origin;
   card.onpointerdown=e=>{if(e.target.closest('input,button:not(.word-open)'))return;origin={x:e.clientX,y:e.clientY};suppressClick=false;longPress=setTimeout(()=>{if(!card.isConnected)return;suppressClick=true;enterSelection(card.dataset.card);},550);};
   card.onpointermove=e=>{if(origin&&(Math.abs(e.clientX-origin.x)>10||Math.abs(e.clientY-origin.y)>10))clearTimeout(longPress);};
   card.onpointerup=card.onpointercancel=card.onpointerleave=()=>clearTimeout(longPress);card.oncontextmenu=e=>e.preventDefault();
  });
  $('#word-select-all').onclick=()=>{if(visible.length&&visible.every(w=>selected.has(w.word)))visible.forEach(w=>selected.delete(w.word));else visible.forEach(w=>selected.add(w.word));draw();};
  $('#bulk-add-tags').onclick=()=>editWordTags(api,[...selected],{onDone:()=>{refreshTags();draw();}});
  $('#bulk-remove-tags').onclick=()=>editWordTags(api,[...selected],{remove:true,onDone:draw});
  $('#bulk-delete').onclick=()=>confirmRemove([...selected]);
 }
 function confirmRemove(keys){openSheet('取消收藏？',`<p class="sheet-note">将移除 ${keys.length} 个单词及其收藏的原句，其他单词和标签保留。</p><button class="primary wide" id="confirm-remove-words">确认取消收藏</button>`);$('#confirm-remove-words').onclick=()=>run(async()=>{state.words=state.words.filter(w=>!keys.includes(w.word));await save();closeSheet();draw();});}
 function wordMenu(w){openSheet(w.word,`<button class="secondary wide" id="word-edit-tags">设置标签</button><button class="secondary wide" id="word-view-contexts">查看释义与原句 · ${encountersOf(w).length}</button><button class="secondary wide danger" id="word-remove">取消收藏</button>`);$('#word-edit-tags').onclick=()=>editWordTags(api,[w.word],{replace:true,onDone:()=>{refreshTags();draw();}});$('#word-view-contexts').onclick=()=>{closeSheet();openWord(w);};$('#word-remove').onclick=()=>confirmRemove([w.word]);}
 function manageTags(){
  openSheet('管理标签',`<div id="tag-management"></div><div class="tag-create"><input class="text-input" id="catalog-new-tag" maxlength="24" placeholder="新标签名称" aria-label="新标签名称"><button class="secondary" id="catalog-create">新建</button></div>`);
  $('#tag-management').innerHTML=state.wordTags.length?state.wordTags.map((t,i)=>`<div class="tag-manage-row"><span>${esc(t)}<small>${state.words.filter(w=>w.tags.includes(t)).length} 个单词</small></span><button data-rename-tag="${i}">改名</button><button data-delete-tag="${i}" class="danger">删除</button></div>`).join(''):'<p class="sheet-note">还没有标签，新建后即可分类。</p>';
  $('#catalog-create').onclick=()=>run(async()=>{const t=cleanTag($('#catalog-new-tag').value);if(!t)return;state.wordTags=uniqueTags([...state.wordTags,t]);await save();refreshTags();draw();manageTags();});
  document.querySelectorAll('[data-rename-tag]').forEach(b=>b.onclick=()=>{const old=state.wordTags[Number(b.dataset.renameTag)];openSheet('重命名标签',`<input class="text-input" id="rename-tag" aria-label="标签名称" maxlength="24" value="${esc(old)}"><button class="primary wide" id="confirm-rename-tag">保存</button>`);$('#confirm-rename-tag').onclick=()=>run(async()=>{const name=cleanTag($('#rename-tag').value);if(!name)return;state.wordTags=uniqueTags(state.wordTags.map(t=>t===old?name:t));for(const w of state.words)w.tags=uniqueTags(w.tags.map(t=>t===old?name:t));await save();refreshTags();draw();manageTags();});});
  document.querySelectorAll('[data-delete-tag]').forEach(b=>b.onclick=()=>{const tag=state.wordTags[Number(b.dataset.deleteTag)];openSheet('删除标签？',`<p class="sheet-note">删除“${esc(tag)}”标签，关联单词和原句保留。</p><button class="primary wide" id="confirm-delete-tag">删除标签</button>`);$('#confirm-delete-tag').onclick=()=>run(async()=>{state.wordTags=state.wordTags.filter(t=>t!==tag);for(const w of state.words)w.tags=w.tags.filter(t=>t!==tag);await save();refreshTags();draw();manageTags();});});
 }
 $('#manage-tags').onclick=manageTags;$('#organize-words').onclick=()=>{selecting=!selecting;selected.clear();draw();};
 for(const id of ['word-search','word-book','word-tag'])$('#'+id)[id==='word-search'?'oninput':'onchange']=()=>{selected.clear();draw();};
 $('#word-sort').onchange=draw;$('#show-word-context').onchange=()=>{state.settings.vocabShowContext=$('#show-word-context').checked;draw();run(save);};draw();
 return ()=>{refreshTags();draw();};
}
