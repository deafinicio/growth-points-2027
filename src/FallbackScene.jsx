import { useEffect,useRef } from 'react';
import * as THREE from 'three';
import { makeTree,seeded,TREE_COLORS } from './tree-model';
import { FluidField } from './fluid';
import { cameraPose } from './camera';

// The same procedural tree and fluid field remain animated without WebGL.
// Canvas2D projects the model; this is a compatibility renderer, not a static image.
export default function FallbackScene(props) {
  const ref=useRef(),latest=useRef(props),dirty=useRef(true);
  latest.current=props;dirty.current=true;
  useEffect(()=>{
    const canvas=ref.current,ctx=canvas.getContext('2d');if(!ctx)return;
    const model=makeTree(),fluid=new FluidField(48),camera=new THREE.PerspectiveCamera(42,1,.1,80),v=new THREE.Vector3(),random=seeded(8021);
    const particles=Array.from({length:100},()=>({x:(random()-.5)*14,y:random()*7,z:(random()-.5)*9,s:random(),speed:random()}));
    const progress=Array(9).fill(0);let trunk=0,time=0,last=0,fluidTime=0,raf,w=0,h=0,dpr=1,disposed=false;
    for(let i=0;i<10;i++){fluid.drive(i*.18);fluid.step(.6);}
    const dyeCanvas=document.createElement('canvas');dyeCanvas.width=dyeCanvas.height=48;const dyeCtx=dyeCanvas.getContext('2d'),dyeImage=dyeCtx.createImageData(48,48);
    const cameraTarget=new THREE.Vector3(0,1,0);camera.position.set(5.8,3.1,10.2);
    const resize=()=>{const r=canvas.getBoundingClientRect();w=r.width;h=r.height;dpr=Math.min(devicePixelRatio||1,1.6);canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr);camera.aspect=w/h;camera.updateProjectionMatrix();dirty.current=true;};
    const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
    function project(point){v.copy(point).project(camera);return [(v.x*.5+.5)*w,(.5-v.y*.5)*h,v.z];}
    const point=(x,y,z)=>project(new THREE.Vector3(x,y,z));
    function glow(x,y,r,color,opacity=1){if(!Number.isFinite(x+y+r)||r<=0)return;ctx.globalAlpha=opacity;const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(.2,color+'aa');g.addColorStop(1,color+'00');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.globalAlpha=1;}
    function line(path,p,color,width,ghost=false){if(p<=.002)return;const pts=path.getPoints(60),count=Math.max(2,Math.floor(p*60));ctx.beginPath();for(let i=0;i<=Math.min(count,60);i++){const pp=project(pts[i]);if(i===0)ctx.moveTo(pp[0],pp[1]);else ctx.lineTo(pp[0],pp[1]);}
      const factor=w>700?w/1250: w/460;
      ctx.lineWidth=width*factor;ctx.lineCap='round';ctx.strokeStyle=ghost?color+'12':color+'85';ctx.shadowColor=color;ctx.shadowBlur=ghost?0:width*1.5;ctx.stroke();ctx.shadowBlur=0;
      if(!ghost){ctx.lineWidth=Math.max(.4,width*factor*.24);ctx.strokeStyle=latest.current.theme==='light'?'#ffffffcc':'#fff5dfbb';ctx.stroke();const pp=project(path.getPoint(Math.min(p,.999)));glow(pp[0],pp[1],7*factor,color,.5);}
    }
    function draw(now){if(disposed)return;raf=requestAnimationFrame(draw);const state=latest.current,delta=Math.min((now-last)/1000||.016,.04);last=now;
      if(document.hidden||w<2||h<2)return;if(!state.animate&&!dirty.current)return;dirty.current=false;
      if(state.animate)time+=delta;
      const mobile=w<740,light=state.theme==='light',pose=cameraPose(state.phase,state.index,time,mobile);const rate=state.reduced||!state.animate?1:1-Math.exp(-delta*2.4);
      camera.position.lerp(new THREE.Vector3(...pose.position),rate);cameraTarget.lerp(new THREE.Vector3(...pose.target),rate);camera.lookAt(cameraTarget);camera.setViewOffset(w,h,-w*pose.offset,h*pose.vertical,w,h);camera.updateProjectionMatrix();camera.updateMatrixWorld();
      for(let i=0;i<9;i++){const target=state.built.includes(i)?1:0;progress[i]+= (target-progress[i])*(state.reduced||!state.animate?1:1-Math.exp(-delta*(i<3?1.7:1.1)));}
      const rootsDone=[0,1,2].every(i=>state.built.includes(i))&&!(state.phase==='growing'&&state.index===2);trunk+=(Number(rootsDone)-trunk)*(state.reduced||!state.animate?1:1-Math.exp(-delta*1.1));
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
      const bg=ctx.createLinearGradient(0,0,w,h);bg.addColorStop(0,light?'#e8e9e1':'#050c0e');bg.addColorStop(.5,light?'#f1f1e9':'#0c1a1a');bg.addColorStop(1,light?'#dfe9e5':'#03090d');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
      const origin=point(0,-.1,0),waterY=Math.min(h*.88,origin[1]);
      glow(origin[0],waterY,Math.min(w*.4,440),light?'#d3c5a4':'#31554f',light?.6:.32);
      if(state.animate&&time-fluidTime>.065){fluid.drive(time,1+state.built.length*.1);fluid.step(.62);fluidTime=time;for(let i=0;i<fluid.length;i++){const k=i*4;dyeImage.data[k]=fluid.pixels[k];dyeImage.data[k+1]=fluid.pixels[k+1];dyeImage.data[k+2]=fluid.pixels[k+2];dyeImage.data[k+3]=Math.min(180,Math.max(fluid.pixels[k],fluid.pixels[k+1],fluid.pixels[k+2]));}dyeCtx.putImageData(dyeImage,0,0);}
      ctx.save();ctx.globalCompositeOperation=light?'multiply':'screen';ctx.globalAlpha=light?.3:.8;ctx.filter='blur(9px)';ctx.drawImage(dyeCanvas,origin[0]-w*.32,waterY-h*.07,w*.64,h*.22);ctx.restore();
      ctx.save();ctx.translate(origin[0],waterY);ctx.scale(1,.24);for(let i=0;i<18;i++){const r=50+i*14+(time*4)%14;ctx.beginPath();ctx.ellipse(0,0,r,r,0,0,Math.PI*2);ctx.strokeStyle=light?`rgba(88,122,112,${.13*(1-i/19)})`:`rgba(155,218,198,${.15*(1-i/19)})`;ctx.lineWidth=.8;ctx.stroke();}ctx.restore();
      // Gentle silhouettes anticipate the tree without revealing completed growth.
      if(state.phase==='intro') {for(const stem of model.stems)line(stem.curve,1,'#b1d1c6',1,true);for(const branch of model.branches){line(branch.curve,1,'#adc4bd',.6,true);for(const twig of branch.twigs)line(twig.curve,1,'#adc4bd',.4,true);}}
      for(let i=0;i<3;i++)line(model.roots[i].curve,progress[i],model.roots[i].color,12);
      for(let i=0;i<3;i++)line(model.stems[i].curve,trunk,model.stems[i].color,9);
      const visibleLeaves=[];
      for(const branch of model.branches){const p=progress[branch.owner];line(branch.curve,p,branch.color,8);for(const twig of branch.twigs){const t=Math.max(0,Math.min(1,(p-twig.delay)*1.8));line(twig.curve,t,twig.color,2.4);}for(const leaf of branch.leaves){const growth=Math.max(0,Math.min(1,(p-leaf.delay)*3));if(growth>.01){const lp=leaf.position.clone();lp.x+=Math.sin(time*.7+lp.y+leaf.seed*5)*.025;const pp=project(lp);visibleLeaves.push({pp,leaf,growth,color:branch.color});}}}
      visibleLeaves.sort((a,b)=>b.pp[2]-a.pp[2]);
      const unit=w>740?w/1300:w/500;
      for(const {pp,leaf,growth,color} of visibleLeaves){const size=(3+leaf.scale[1]*18)*growth*unit;ctx.save();ctx.translate(pp[0],pp[1]);ctx.rotate(leaf.rotation[2]+Math.sin(time*.3+leaf.seed*6)*.08);const g=ctx.createLinearGradient(-size,0,size,0);g.addColorStop(0,color+'12');g.addColorStop(.42,light?'#ffffffd0':color+'90');g.addColorStop(.55,light?color+'b0':'#f2ffeccc');g.addColorStop(1,color+'15');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,size*.35,size,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=light?'#ffffffa0':color+'70';ctx.lineWidth=.4;ctx.stroke();ctx.restore();if(leaf.seed>.975)glow(pp[0],pp[1],size*2,color,.25);}
      // The seed and the final glass fruit have layered specular highlights.
      const fruit=progress[8],seed=fruit>.02?point(0,4.65,.3):point(0,.22,0),size=fruit>.02?(18+fruit*13)*unit:10*unit;
      glow(seed[0],seed[1],size*5,fruit>.02?'#f5c68c':'#9fddc8',.2+.06*Math.sin(time));
      const pearl=ctx.createRadialGradient(seed[0]-size*.32,seed[1]-size*.4,1,seed[0],seed[1],size);pearl.addColorStop(0,'#ffffff');pearl.addColorStop(.18,'#fff0c9');pearl.addColorStop(.38,fruit>.02?'#e9b76f':'#b7f2df');pearl.addColorStop(.7,fruit>.02?'#92765199':'#498f8580');pearl.addColorStop(1,light?'#a8c5b355':'#d3ffe5a0');ctx.fillStyle=pearl;ctx.beginPath();ctx.ellipse(seed[0],seed[1],size*(1+Math.sin(time*1.2)*.035),size,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#faffdf99';ctx.lineWidth=.65;ctx.stroke();
      for(let i=0;i<particles.length;i++){const p=particles[i],pos=point(p.x+Math.sin(time*.13+i)*.15,(p.y+time*(.02+p.speed*.025))%7,p.z);ctx.globalAlpha=(light?.25:.55)*(.4+.6*Math.sin(time*.6+i)**2);ctx.fillStyle=TREE_COLORS[i%3];ctx.beginPath();ctx.arc(pos[0],pos[1],(.5+p.s)*unit,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
      const vignette=ctx.createRadialGradient(w*.6,h*.45,h*.15,w*.6,h*.45,h*.9);vignette.addColorStop(0,'#00000000');vignette.addColorStop(1,light?'#536b6715':'#0000009a');ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
    }
    raf=requestAnimationFrame(draw);return()=>{disposed=true;cancelAnimationFrame(raf);observer.disconnect();};
  },[]);
  return <canvas ref={ref} className="cinema-fallback" aria-label="Анімована просторова сцена дерева зростання"/>;
}
