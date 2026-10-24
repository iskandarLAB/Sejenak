// Removes metadata that can identify guests (GPS location, camera serials, XMP, comments) from uploaded images.
// Works on the encoded bytes so no image library is needed; pixel data is never touched.
// JPEG keeps its EXIF orientation as a minimal synthetic EXIF block, so phone photos do not appear rotated.
const bad=()=>{throw {message:'Foto tidak dapat dibaca. Cuba ambil semula atau pilih foto lain.',status:400}};
const u16=(b,i,le)=>le?b[i]|b[i+1]<<8:b[i]<<8|b[i+1];
const u32=(b,i,le)=>le?(b[i]|b[i+1]<<8|b[i+2]<<16|b[i+3]<<24)>>>0:(b[i]<<24|b[i+1]<<16|b[i+2]<<8|b[i+3])>>>0;
const join=parts=>{const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let o=0;for(const p of parts){out.set(p,o);o+=p.length}return out};
const ascii=(b,i,n)=>String.fromCharCode(...b.subarray(i,i+n));
function orientation(seg){// seg is an APP1 payload; returns 1..8 or 1 when absent/unreadable
 if(seg.length<14||ascii(seg,0,6)!=='Exif\0\0')return 1;const t=seg.subarray(6),le=ascii(t,0,2)==='II';if(!le&&ascii(t,0,2)!=='MM')return 1;
 const ifd=u32(t,4,le);if(ifd+2>t.length)return 1;const n=u16(t,ifd,le);
 for(let k=0;k<n;k++){const e=ifd+2+k*12;if(e+12>t.length)break;if(u16(t,e,le)===0x0112){const v=u16(t,e+8,le);return v>=1&&v<=8?v:1}}return 1}
function orientationSegment(v){// Big-endian TIFF with a single IFD entry: Orientation (SHORT)
 const payload=new Uint8Array([0x45,0x78,0x69,0x66,0,0,0x4d,0x4d,0,0x2a,0,0,0,8,0,1,0x01,0x12,0,3,0,0,0,1,0,v,0,0,0,0,0,0]);
 return join([new Uint8Array([0xff,0xe1,(payload.length+2)>>8,(payload.length+2)&255]),payload])}
function jpeg(b){
 const keep=[b.subarray(0,2)];let i=2,turn=1,app0=0;
 while(i<b.length){
  if(b[i]!==0xff)bad();while(b[i]===0xff&&b[i+1]===0xff)i++;const m=b[i+1];
  if(m===0xd9){keep.push(b.subarray(i,i+2));i+=2;break}
  if(m>=0xd0&&m<=0xd7||m===0x01){keep.push(b.subarray(i,i+2));i+=2;continue}
  if(i+4>b.length)bad();const len=u16(b,i+2);if(len<2||i+2+len>b.length)bad();const seg=b.subarray(i,i+2+len);
  if(m===0xda){keep.push(b.subarray(i));i=b.length;break}// start of scan: the rest is image data
  if(m===0xe1){if(turn===1)turn=orientation(b.subarray(i+4,i+2+len))}// EXIF or XMP: dropped
  else if(m===0xed||m===0xfe||(m>=0xe3&&m<=0xef&&m!==0xee)){}// IPTC, comments, vendor APP blocks: dropped
  else{keep.push(seg);if(m===0xe0&&keep.length===2)app0=1}// APP0 JFIF, APP2 ICC colour, APP14 Adobe and all coding segments stay
  i+=2+len}
 if(turn!==1)keep.splice(1+app0,0,orientationSegment(turn));
 return join(keep)}
function png(b){
 const keep=[b.subarray(0,8)];let i=8;
 while(i+12<=b.length){const len=u32(b,i,false),type=ascii(b,i+4,4),end=i+12+len;if(end>b.length)bad();
  if(!['eXIf','tEXt','zTXt','iTXt','tIME'].includes(type))keep.push(b.subarray(i,end));i=end;if(type==='IEND')break}
 return join(keep)}
function webp(b){
 const keep=[];let i=12,vp8x=null;
 while(i+8<=b.length){const type=ascii(b,i,4),len=u32(b,i+4,true),end=i+8+len+(len&1);if(i+8+len>b.length)bad();
  if(type!=='EXIF'&&type!=='XMP '){const chunk=b.slice(i,Math.min(end,b.length));if(type==='VP8X'){chunk[8]&=~0x0c;vp8x=chunk}keep.push(chunk)}i=end}
 const body=join(keep),head=b.slice(0,12),size=body.length+4;head[4]=size&255;head[5]=size>>8&255;head[6]=size>>16&255;head[7]=size>>>24&255;return join([head,body])}
export function stripMetadata(bytes,type){return type==='image/jpeg'?jpeg(bytes):type==='image/png'?png(bytes):type==='image/webp'?webp(bytes):bytes}
