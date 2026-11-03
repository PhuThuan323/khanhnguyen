export function detectedFormat(buffer) {
  if (buffer.length>=3 && buffer.subarray(0,3).equals(Buffer.from([0xff,0xd8,0xff]))) return 'jpg';
  if (buffer.length>=8 && buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'png';
  if (buffer.length>=12 && buffer.toString('ascii',0,4)==='RIFF' && buffer.toString('ascii',8,12)==='WEBP') return 'webp';
  if (buffer.length>=5 && buffer.toString('ascii',0,5)==='%PDF-') return 'pdf';
  return null;
}
