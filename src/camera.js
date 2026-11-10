export function cameraPose(phase,index,time=0,mobile=false) {
  let position,target,offset;
  if(phase==='intro') {position=[5.8,3.1,10.2];target=[0,1.75,0];offset=.16;}
  else if(phase==='question') {position=index<3?[5.2,3.2,9.2]:[7,4.4,10.4];target=index<3?[0,.65,0]:[0,2.6,0];offset=.2;}
  else if(phase==='growing') {position=index<3?[4.5,2.8,7.5]:[7.2,4.6,10];target=index<3?[0,.3,0]:[0,2.7,0];offset=0;}
  else {const a=phase==='finale'?time*.035:0;position=[Math.sin(a)*5.8+6.2,4.3,Math.cos(a)*9.7+1];target=[0,phase==='chapter'&&index<3?1.45:2.5,0];offset=.14;}
  if(mobile){position=position.map((x,i)=>i===2?x*1.2:x);offset=0;}
  return {position,target,offset,vertical:mobile&&phase==='question'?.18:0};
}
