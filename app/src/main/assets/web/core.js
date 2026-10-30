export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const normalizeWord = word => word.toLowerCase().replaceAll('’',"'").replace(/[‐‑]/g,'-').replace(/^[^a-z]+|[^a-z]+$/g,'');
export function wordAt(text, offset) {
    for (const match of text.matchAll(/[A-Za-z]+(?:['’][A-Za-z]+)*/g)) {
        if (offset < match.index || offset >= match.index + match[0].length) continue;
        const hit={word:match[0],start:match.index,end:match.index+match[0].length};
        for(const full of text.matchAll(/[A-Za-z]+(?:['’\-‐‑][A-Za-z]+)*/g))
            if(full.index<=hit.start&&full.index+full[0].length>=hit.end&&/[-‐‑]/.test(full[0]))hit.compound=full[0];
        return hit;
    }
    return null;
}
export function sentenceAt(text, word) {
    const sentences = text.match(/[^.!?]+(?:[.!?]+["'”’]?|$)/g) || [text];
    return (sentences.find(s => s.toLowerCase().includes(word.toLowerCase())) || text).trim().slice(0,1400);
}
// Match complete surface words, preserving the spelling actually encountered in the book.
export function highlightContext(text, queried) {
    let html='', end=0;
    const target=normalizeWord(queried || '');
    const pattern=/[-‐‑]/.test(target)?/[A-Za-z]+(?:['’\-‐‑][A-Za-z]+)*/g:/[A-Za-z]+(?:['’][A-Za-z]+)*/g;
    for (const m of text.matchAll(pattern)) {
        if (!target || normalizeWord(m[0])!==target) continue;
        html+=escapeHTML(text.slice(end,m.index))+`<mark class="query-highlight">${escapeHTML(m[0])}</mark>`;
        end=m.index+m[0].length;
    }
    return html+escapeHTML(text.slice(end));
}
export function splitChapters(text) {
    text = text.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
    const lines = text.split('\n'), chapters = []; let title='正文', body=[];
    for (const line of lines) {
        if (/^\s*(?:(?:chapter|part|book)\s+(?:\d+|[ivxlcdm]+|one|two|three|four|five|six|seven|eight|nine|ten)\b.*|第[零一二三四五六七八九十百千\d]+[章节卷].*)\s*$/i.test(line) && line.length<150) {
            if(body.join('').trim())chapters.push({title,text:body.join('\n')});
            title=line.trim();body=[];
        } else body.push(line);
    }
    if(body.join('').trim())chapters.push({title,text:body.join('\n')});
    return chapters.length?chapters:[{title:'正文',text}];
}
export function textBook(text,title) {
    const chapters=splitChapters(text), urls=[];
    const sections=chapters.map((c,i)=>({id:String(i),size:c.text.length,linear:'yes',load:()=>{
        if(!urls[i])urls[i]=URL.createObjectURL(new Blob([`<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body><h1>${escapeHTML(c.title==='正文'?title:c.title)}</h1>${c.text.split(/\n\s*\n/).map(p=>`<p>${escapeHTML(p).replaceAll('\n','<br>')}</p>`).join('')}</body></html>`],{type:'text/html'}));
        return urls[i];
    },unload:()=>{},createDocument:()=>new DOMParser().parseFromString(`<body>${escapeHTML(c.text)}</body>`,'text/html')}));
    return {metadata:{title,language:'en'},sections,toc:chapters.map((c,i)=>({label:c.title,href:String(i)})),resolveHref:href=>({index:Number(href)}),splitTOCHref:href=>[String(href),null],getTOCFragment:doc=>doc.body,destroy:()=>urls.forEach(u=>URL.revokeObjectURL(u))};
}
export function validateState(value) {
    if(value?.version!==1||!Array.isArray(value.books)||!Array.isArray(value.words)||typeof value.settings!=='object'||!value.settings)throw Error('本地数据格式无效');
    if(value.books.some(b=>!b||!b.id||!b.title||!b.file))throw Error('书籍数据格式无效');
    if(value.words.some(w=>!w||typeof w.word!=='string'||!w.word.trim()))throw Error('生词数据格式无效');
    return value;
}
