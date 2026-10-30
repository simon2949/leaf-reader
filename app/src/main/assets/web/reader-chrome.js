export const readerIcons={
 toc:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
 moon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14a8 8 0 0 1-10-10 8.5 8.5 0 1 0 10 10Z"/></svg>',
 sun:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"/></svg>',
 settings:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 3-5 9 5 9h8l5-9-5-9Z"/><circle cx="12" cy="12" r="3"/></svg>',
};
export function readingPalette(theme){return {background:theme==='night'?'#000000':theme==='white'?'#ffffff':'#f6f4ed',text:theme==='night'?'#ffffff':'#000000'};}
export function brightnessValue(settings){const value=Number(settings.brightnessLevel);return settings.brightnessMode==='manual'?Math.max(.05,Math.min(1,(Number.isFinite(value)?value:60)/100)):-1;}
export function flattenChapters(list,depth=0){return (list||[]).flatMap(item=>[...(item.href!==undefined?[{...item,depth}]:[]),...flattenChapters(item.subitems,depth+1)]);}
