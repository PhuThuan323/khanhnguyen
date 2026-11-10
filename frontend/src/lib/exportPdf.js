/** Client-side, self-contained A4 PDF exporter. Vietnamese glyphs are painted by the
 * browser onto JPEG-backed PDF pages; no external PDF service/fonts or API key. */
const W=1240, H=1754, M=66;
const E=new TextEncoder();
const enc=s=>E.encode(s);
function unbase64(s){const raw=atob(s);const b=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)b[i]=raw.charCodeAt(i);return b;}
function combine(parts){const out=new Uint8Array(parts.reduce((n,x)=>n+x.length,0));let p=0;for(const x of parts){out.set(x,p);p+=x.length;}return out;}
function wrap(ctx,text,maxWidth,maxLines=3){const words=String(text??'—').split(/\s+/);const lines=[];let line='';for(const word of words){const next=line?line+' '+word:word;if(ctx.measureText(next).width>maxWidth&&line){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);return lines.length>maxLines?[...lines.slice(0,maxLines-1),lines[maxLines-1].slice(0,38)+'…']:lines;}
export function exportTablePdf({title,subtitle='',columns,rows,summary=[],filename='bao-cao.pdf'}){
 if(!Array.isArray(columns)||!columns.length)throw Error('Chưa có cột báo cáo.');
 const totalWeight=columns.reduce((n,c)=>n+(c.weight||1),0), widths=columns.map(c=>(W-2*M)*(c.weight||1)/totalWeight);
 const pages=[];let canvas,ctx,y,pageNo=0;
 function makePage(){canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);ctx.fillStyle='#111827';ctx.font='bold 34px Arial, sans-serif';ctx.fillText(title.slice(0,70),M,90);ctx.font='20px Arial, sans-serif';ctx.fillStyle='#475569';const sub=wrap(ctx,subtitle,W-2*M,3);for(let i=0;i<sub.length;i++)ctx.fillText(sub[i],M,127+i*27);y=154+sub.length*27;ctx.fillStyle='#e9edf3';ctx.fillRect(M,y,W-2*M,48);ctx.fillStyle='#1f2937';ctx.font='bold 18px Arial, sans-serif';let x=M;for(let i=0;i<columns.length;i++){ctx.fillText(String(columns[i].label),x+7,y+31,widths[i]-14);x+=widths[i];}y+=53;pageNo++;}
 function finish(){ctx.fillStyle='#64748b';ctx.font='17px Arial, sans-serif';ctx.fillText('Garage OS • Báo cáo nội bộ • '+new Date().toLocaleDateString('vi-VN'),M,H-35);ctx.textAlign='right';ctx.fillText('Trang '+pageNo,W-M,H-35);ctx.textAlign='left';pages.push(unbase64(canvas.toDataURL('image/jpeg',.88).split(',')[1]));}
 makePage();
 for(const row of rows){const values=columns.map(c=>String(row[c.key]??'—'));ctx.font='18px Arial, sans-serif';const lines=values.map((v,i)=>wrap(ctx,v,widths[i]-18,4));const height=Math.max(46,...lines.map(a=>a.length*25+13));if(y+height>H-160){finish();makePage();}if(rows.indexOf(row)%2===0){ctx.fillStyle='#f8fafc';ctx.fillRect(M,y,W-2*M,height);}ctx.fillStyle='#1f2937';ctx.font='18px Arial, sans-serif';let x=M;lines.forEach((a,i)=>{a.forEach((line,j)=>ctx.fillText(line,x+7,y+25+j*25,widths[i]-14));x+=widths[i];});ctx.strokeStyle='#e5e7eb';ctx.beginPath();ctx.moveTo(M,y+height);ctx.lineTo(W-M,y+height);ctx.stroke();y+=height;}
 if(summary.length){if(y+70+summary.length*34>H-150){finish();makePage();}y+=24;ctx.font='bold 23px Arial, sans-serif';ctx.fillStyle='#111827';ctx.fillText('TỔNG HỢP',M,y);y+=32;for(const item of summary){ctx.font='bold 19px Arial, sans-serif';ctx.fillText(`${item.label}: ${item.value}`,M,y);y+=32;}}
 finish();
 const objects=[],add=b=>{objects.push(b);return objects.length;};
 const catalog=add(enc('<< /Type /Catalog /Pages 2 0 R >>'));
 const pagesId=add(enc('<< /Type /Pages /Kids [] /Count 0 >>'));
 const pageIds=[];
 for(const bytes of pages){const imgId=objects.length+1,streamId=imgId+1,pageId=imgId+2;const img=combine([enc(`<< /Type /XObject /Subtype /Image /Width ${W} /Height ${H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`),bytes,enc('\nendstream')]);add(img);const content=enc('q 595.28 0 0 841.89 0 0 cm /Im0 Do Q');add(enc(`<< /Length ${content.length} >>\nstream\n${new TextDecoder().decode(content)}\nendstream`));add(enc(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${imgId} 0 R >> >> /Contents ${streamId} 0 R >>`));pageIds.push(pageId);}
 objects[pagesId-1]=enc(`<< /Type /Pages /Kids [${pageIds.map(i=>i+' 0 R').join(' ')}] /Count ${pageIds.length} >>`);
 let byteCount=enc('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n').length;const parts=[enc('%PDF-1.4\n')],offsets=[0];byteCount=parts[0].length;
 objects.forEach((obj,i)=>{offsets.push(byteCount);const part=combine([enc(`${i+1} 0 obj\n`),obj,enc('\nendobj\n')]);parts.push(part);byteCount+=part.length;});
 const xrefAt=byteCount;
 let xref=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
 for(let i=1;i<offsets.length;i++)xref+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
 xref+=`trailer\n<< /Size ${objects.length+1} /Root ${catalog} 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
 parts.push(enc(xref));
 const blob=new Blob(parts,{type:'application/pdf'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename.replace(/[^a-zA-Z0-9_.-]/g,'_');document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
 return {pages:pages.length,bytes:blob.size};
}
