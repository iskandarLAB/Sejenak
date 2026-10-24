export function countdownParts(date,now=Date.now()){
 const target=Date.parse(date+'T00:00:00+08:00');
 if(!Number.isFinite(target))return null;
 const remaining=Math.max(0,Math.ceil((target-now)/1000));
 return {days:Math.floor(remaining/86400),hours:Math.floor(remaining%86400/3600),minutes:Math.floor(remaining%3600/60),seconds:remaining%60,arrived:remaining===0};
}
