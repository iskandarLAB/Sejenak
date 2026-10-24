export function wrapPosterText(measure,text,width){const lines=[];for(const paragraph of String(text||'').split('\n')){let line='';for(const word of paragraph.split(/\s+/).filter(Boolean)){if(measure(word)>width){if(line){lines.push(line);line=''}let part='';for(const c of word){if(part&&measure(part+c)>width){lines.push(part);part=''}part+=c}line=part}else if(line&&measure(line+' '+word)>width){lines.push(line);line=word}else line+=(line?' ':'')+word}if(line)lines.push(line)}return lines}
export function posterTextBlock(measure,text,width,maxLines){let lines=wrapPosterText(measure,text,width);if(lines.length>maxLines){lines=lines.slice(0,maxLines);let last=lines[maxLines-1];while(last&&measure(last+'…')>width)last=last.slice(0,-1);lines[maxLines-1]=last+'…'}return lines}

// Preserve ornamental corners while extending only the middle of 3:4 artwork to 9:16.
export function invitationArtworkSlices(imageWidth,imageHeight,width=1080,height=1920){
 const cornerSource=imageHeight*.4,cornerHeight=Math.min(cornerSource*width/imageWidth,height*.4),middleSource=imageHeight-cornerSource*2;
 return [
  {sy:0,sh:cornerSource,dy:0,dh:cornerHeight},
  {sy:cornerSource,sh:middleSource,dy:cornerHeight,dh:height-cornerHeight*2},
  {sy:imageHeight-cornerSource,sh:cornerSource,dy:height-cornerHeight,dh:cornerHeight}
 ];
}
