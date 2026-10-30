import {normalizeWord} from './core.js';
import {Overlayer} from './vendor/foliate/overlayer.js';
export function swipeDirection(dx,dy,elapsed){return elapsed<=650&&Math.abs(dx)>=28&&Math.abs(dx)>Math.abs(dy)*1.5?(dx<0?'next':'prev'):null;}
export function edgeDirection(x,width){const edge=Math.max(24,Math.min(52,width*.12));return x<=edge?'prev':x>=width-edge?'next':null;}
const drawn=new WeakMap(),nodes=new WeakMap();
// Draw outside the publication DOM: text, CFI locations and selection stay intact.
export function underlineSavedWords({doc,overlayer},forms,{enabled,night,visible,viewport}){
 if(!overlayer)return;
 for(const key of drawn.get(overlayer)||[])overlayer.remove(key);
 const keys=[];drawn.set(overlayer,keys);overlayer.element.dataset.savedUnderlines='0';if(!enabled||!forms.size)return;
 let texts=nodes.get(doc);if(!texts){texts=[];const walk=doc.createTreeWalker(doc.body,4);let node;while(node=walk.nextNode())if(!node.parentElement.closest('script,style,rt,rp'))texts.push(node);nodes.set(doc,texts);}
 const frame=doc.defaultView.frameElement.getBoundingClientRect();
 for(const node of texts){
  if(visible?.startContainer.ownerDocument===doc&&!visible.intersectsNode(node))continue;
  const matches=[];
  for(const full of node.textContent.matchAll(/[A-Za-z]+(?:['’\-‐‑][A-Za-z]+)*/g)){
   if(forms.has(normalizeWord(full[0])))matches.push(full);
   else for(const part of full[0].matchAll(/[A-Za-z]+(?:['’][A-Za-z]+)*/g))if(forms.has(normalizeWord(part[0])))matches.push({0:part[0],index:full.index+part.index});
  }
  for(const m of matches){
   const range=doc.createRange();range.setStart(node,m.index);range.setEnd(node,m.index+m[0].length);
   if(![...range.getClientRects()].some(r=>r.right+frame.left>viewport.left&&r.left+frame.left<viewport.right&&r.bottom+frame.top>viewport.top&&r.top+frame.top<viewport.bottom))continue;
   const key='leaf-saved:'+keys.length;overlayer.add(key,range,Overlayer.underline,{color:night?'#a4c5a7':'#527963',width:1});keys.push(key);
  }
 }
 overlayer.element.dataset.savedUnderlines=String(keys.length);
}
