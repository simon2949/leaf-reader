import {readingFonts,selectedFont,fontFace,fontFamily} from './reading-preferences.js';
import {escapeHTML as esc} from './core.js';
export const fontPickerHTML=()=>`<div class="font-picker"><button class="reading-select" id="reading-font" type="button" aria-label="英文字体" aria-haspopup="listbox" aria-expanded="false" aria-controls="reading-font-options"><span id="reading-font-name"></span><span aria-hidden="true">⌄</span></button><div id="reading-font-options" role="listbox" aria-label="英文字体" hidden>${readingFonts.map(f=>`<button type="button" role="option" data-font="${f.id}" aria-selected="false" tabindex="-1"><span>${esc(f.name)}</span><span class="font-check" aria-hidden="true">✓</span></button>`).join('')}</div></div>`;
export function mountFontPicker(settings,onChange){
 const trigger=document.querySelector('#reading-font'),list=document.querySelector('#reading-font-options'),options=[...list.querySelectorAll('[data-font]')];
 let style=document.querySelector('#reading-font-face');if(!style){style=document.createElement('style');style.id='reading-font-face';document.head.append(style);}
 style.textContent=readingFonts.map(f=>fontFace(f,window.location.origin)).join('\n');
 for(const option of options)option.style.fontFamily=fontFamily(selectedFont(option.dataset.font));
 const sync=()=>{const font=selectedFont(settings.fontFamily);document.querySelector('#reading-font-name').textContent=font.name;trigger.style.fontFamily=fontFamily(font);trigger.dataset.value=font.id;for(const option of options){const chosen=option.dataset.font===font.id;option.setAttribute('aria-selected',String(chosen));option.tabIndex=chosen?0:-1;}};
 const open=focus=>{list.hidden=false;trigger.setAttribute('aria-expanded','true');if(focus)options.find(o=>o.getAttribute('aria-selected')==='true')?.focus();};
 const close=()=>{list.hidden=true;trigger.setAttribute('aria-expanded','false');};
 trigger.onclick=()=>list.hidden?open(false):close();
 trigger.onkeydown=e=>{if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();open(true);}};
 options.forEach((option,index)=>{
  option.onclick=()=>{settings.fontFamily=option.dataset.font;sync();close();trigger.focus();onChange();};
  option.onkeydown=e=>{let target;if(e.key==='ArrowDown')target=(index+1)%options.length;else if(e.key==='ArrowUp')target=(index+options.length-1)%options.length;else if(e.key==='Home')target=0;else if(e.key==='End')target=options.length-1;else if(e.key==='Escape'){e.stopPropagation();close();trigger.focus();return;}if(target!==undefined){e.preventDefault();options[target].focus();}};
 });
 list.addEventListener('focusout',()=>requestAnimationFrame(()=>{if(list.isConnected&&!list.contains(document.activeElement)&&document.activeElement!==trigger)close();}));sync();
}
