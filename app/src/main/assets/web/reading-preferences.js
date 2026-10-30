// Bundled font files keep every choice available without Android font downloads.
export const readingFonts=[
 {id:'noto-serif',name:'Noto Serif',label:'Noto Serif · 书籍衬线',file:'NotoSerif-Regular.ttf',fallback:'serif'},
 {id:'noto-sans',name:'Noto Sans',label:'Noto Sans · 清晰无衬线',file:'NotoSans-Regular.ttf',fallback:'sans-serif'},
 {id:'liberation-serif',name:'Liberation Serif',label:'Liberation Serif · 经典衬线',file:'LiberationSerif-Regular.ttf',fallback:'serif'},
 {id:'liberation-sans',name:'Liberation Sans',label:'Liberation Sans · 经典无衬线',file:'LiberationSans-Regular.ttf',fallback:'sans-serif'},
 {id:'dejavu-serif',name:'DejaVu Serif',label:'DejaVu Serif · 宽松衬线',file:'DejaVuSerif.ttf',fallback:'serif'},
 {id:'dejavu-sans',name:'DejaVu Sans',label:'DejaVu Sans · 宽松无衬线',file:'DejaVuSans.ttf',fallback:'sans-serif'},
 {id:'liberation-mono',name:'Liberation Mono',label:'Liberation Mono · 等宽',file:'LiberationMono-Regular.ttf',fallback:'monospace'},
];
export const alignments=[['left','左对齐'],['justify','两端对齐'],['center','居中'],['right','右对齐']];
export function selectedFont(id){return readingFonts.find(f=>f.id===id)||readingFonts[0];}
export function selectedAlignment(value){return alignments.some(([id])=>id===value)?value:'left';}
export function fontFace(font,origin){return `@font-face{font-family:"Leaf ${font.name}";src:url("${origin}/fonts/${font.file}") format("truetype");font-weight:400;font-style:normal;font-display:swap;}`;}
export function fontFamily(font){return `"Leaf ${font.name}",${font.fallback}`;}
