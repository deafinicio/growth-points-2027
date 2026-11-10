import { Component,Suspense,useEffect,useMemo,useRef,useState } from 'react';
import { Canvas,useFrame,useThree } from '@react-three/fiber';
import { Environment,Lightformer,MeshReflectorMaterial,MeshDistortMaterial,PerformanceMonitor } from '@react-three/drei';
import { Bloom,EffectComposer,Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import FallbackScene from './FallbackScene';
import { FluidField } from './fluid';
import { makeTree,taperedTube,seeded,TREE_COLORS } from './tree-model';
import { cameraPose } from './camera';

const coreVertex=`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const coreFragment=`varying vec2 vUv; uniform float uTime; uniform vec3 uColor; uniform float uGrowth; uniform float uEnergy;
void main(){if(vUv.x>uGrowth)discard;float flow=pow(.5+.5*sin(vUv.x*38.-uTime*2.2),9.);float stream=pow(.5+.5*sin(vUv.x*17.-uTime*1.1+sin(vUv.y*6.28)),5.);float tip=pow(max(0.,1.-abs(vUv.x-uGrowth)*12.),4.);vec3 color=uColor*(.25+flow*1.7+stream*.3+tip*2.2)*uEnergy;gl_FragColor=vec4(color,.8);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
const waterVertex=`varying vec2 vUv;varying vec3 vPosition;uniform float uTime;void main(){vUv=uv;vec3 p=position;float r=length(p.xy);p.z=sin(r*4.-uTime*.9)*.014+sin(p.x*1.8+p.y*2.-uTime*.4)*.018;vPosition=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
const waterFragment=`varying vec2 vUv;varying vec3 vPosition;uniform sampler2D uFluid;uniform float uTime;uniform float uLight;uniform float uPulse;
void main(){vec2 p=vUv-.5;float r=length(p)*2.;vec2 uv=vUv+vec2(sin(p.y*17.+uTime*.2),cos(p.x*13.-uTime*.15))*.012;vec3 dye=texture2D(uFluid,uv).rgb;vec3 adjacent=texture2D(uFluid,uv+vec2(.007,.004)).rgb;float grad=length(dye-adjacent);float waves=pow(.5+.5*sin(length(vPosition.xy)*7.-uTime*.75),18.);float caustic=pow(max(0.,sin(p.x*70.+sin(p.y*55.+uTime*.25))*sin(p.y*58.-uTime*.2)),10.);float fade=smoothstep(.95,.18,r);float pulse=exp(-pow((length(vPosition.xy)-mod(uTime*.7,7.))*3.,2.))*uPulse;vec3 c=dye*(uLight>.5?.6:1.9)+vec3(.55,.85,.74)*(grad*3.+waves*.025+caustic*.04+pulse*.15);float a=fade*(length(dye)*.48+grad*1.2+waves*.07+pulse*.12);gl_FragColor=vec4(c,min(a,.72));
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
function CameraRig({phase,index,animate,reduced}) {
  const {camera,size}=useThree(),look=useRef(new THREE.Vector3(0,1.75,0)),time=useRef(0),offset=useRef(.16),vertical=useRef(0);
  useFrame((_,dt)=>{
    const delta=Math.min(dt,.05);if(animate)time.current+=delta;
    const pose=cameraPose(phase,index,time.current,size.width<740),rate=!animate||reduced?1:1-Math.exp(-delta*2.2);
    camera.position.lerp(new THREE.Vector3(...pose.position),rate);look.current.lerp(new THREE.Vector3(...pose.target),rate);camera.lookAt(look.current);
    offset.current=THREE.MathUtils.lerp(offset.current,pose.offset,rate);vertical.current=THREE.MathUtils.lerp(vertical.current,pose.vertical,rate);
    camera.setViewOffset(size.width,size.height,-size.width*offset.current,size.height*vertical.current,size.width,size.height);camera.updateProjectionMatrix();
  });
  return null;
}
function GrowingTube({data,target,material,animate,core=true,delay=0,radiusScale=1}) {
  const geometry=useMemo(()=>taperedTube(data.curve,data.radius*radiusScale,core?64:28,core?9:5),[data,radiusScale,core]);
  const inner=useMemo(()=>core?taperedTube(data.curve,data.radius*.25,64,5):null,[data,core]);
  const progress=useRef(0),coreRef=useRef();
  const uniforms=useMemo(()=>({uTime:{value:0},uColor:{value:new THREE.Color(data.color)},uGrowth:{value:0},uEnergy:{value:1.3}}),[data.color]);
  useEffect(()=>()=>{geometry.dispose();inner?.dispose();},[geometry,inner]);
  useFrame((_,dt)=>{
    const desired=Math.max(0,Math.min(1,(target-delay)/(1-delay)));progress.current=animate?THREE.MathUtils.damp(progress.current,desired,1.9,Math.min(dt,.05)):desired;
    if(Math.abs(progress.current-desired)<.002)progress.current=desired;
    geometry.setDrawRange(0,Math.floor(geometry.index.count*progress.current/6)*6);
    if(inner){inner.setDrawRange(0,Math.floor(inner.index.count*progress.current/6)*6);uniforms.uGrowth.value=progress.current;if(animate)uniforms.uTime.value+=Math.min(dt,.05);}
  });
  return <group><mesh geometry={geometry} material={material}/>{core&&<mesh geometry={inner}><shaderMaterial ref={coreRef} vertexShader={coreVertex} fragmentShader={coreFragment} uniforms={uniforms} transparent depthWrite={false} toneMapped={false}/></mesh>}</group>;
}
function Leaves({branch,target,material,animate}) {
  const mesh=useRef(),growth=useRef(0),time=useRef(0),object=useMemo(()=>new THREE.Object3D(),[]);
  useFrame((_,dt)=>{const delta=Math.min(dt,.05);growth.current=animate?THREE.MathUtils.damp(growth.current,target,1.3,delta):target;if(animate)time.current+=delta;
    branch.leaves.forEach((leaf,i)=>{const p=Math.max(.0001,Math.min(1,(growth.current-leaf.delay)*3.5));object.position.copy(leaf.position);object.position.x+=Math.sin(time.current*.75+leaf.position.y+leaf.seed*6)*.025*p;object.rotation.set(...leaf.rotation);object.rotation.z+=Math.sin(time.current*.5+leaf.seed*8)*.06;object.scale.set(leaf.scale[0]*p,leaf.scale[1]*p,leaf.scale[2]*p);object.updateMatrix();mesh.current.setMatrixAt(i,object.matrix);});mesh.current.instanceMatrix.needsUpdate=true;
  });
  return <instancedMesh ref={mesh} args={[undefined,undefined,branch.leaves.length]} material={material} frustumCulled={false}><sphereGeometry args={[1,8,6]}/></instancedMesh>;
}
function Branch({branch,visible,glass,leafMaterial,animate}) {
  const progress=useRef(0),[value,setValue]=useState(0),previous=useRef(-1);
  // One small React update per growth threshold drives all subsidiary twigs;
  // leaves and materials animate directly inside the frame loop.
  useFrame((_,dt)=>{progress.current=animate?THREE.MathUtils.damp(progress.current,visible?1:0,1.4,Math.min(dt,.05)):Number(visible);const quantized=Math.round(progress.current*50)/50;if(quantized!==previous.current){previous.current=quantized;setValue(quantized);}});
  return <group><GrowingTube data={branch} target={visible?1:0} material={glass} animate={animate}/>{branch.twigs.map((twig,i)=><GrowingTube key={i} data={twig} target={value} delay={twig.delay} material={glass} animate={animate} core={false}/>)}<Leaves branch={branch} target={visible?1:0} material={leafMaterial} animate={animate}/></group>;
}
function LiquidSurface({animate,theme,quality,built}) {
  const field=useMemo(()=>{const f=new FluidField(quality==='high'?56:40);for(let i=0;i<10;i++){f.drive(i*.18);f.step(.6);}return f;},[quality]),texture=useMemo(()=>{const t=new THREE.DataTexture(field.pixels,field.size,field.size,THREE.RGBAFormat);t.minFilter=t.magFilter=THREE.LinearFilter;t.needsUpdate=true;return t;},[field]);
  const time=useRef(0),lastStep=useRef(0),uniforms=useMemo(()=>({uTime:{value:0},uFluid:{value:texture},uLight:{value:theme==='light'?1:0},uPulse:{value:1}}),[texture,theme]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  useFrame((_,dt)=>{if(!animate)return;time.current+=Math.min(dt,.05);uniforms.uTime.value=time.current;if(time.current-lastStep.current>.06){field.drive(time.current,1+built.length*.12);field.step(.63);texture.needsUpdate=true;lastStep.current=time.current;}});
  return <group>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.12,0]}><planeGeometry args={[55,55]}/><MeshReflectorMaterial resolution={quality==='high'?512:256} blur={quality==='high'?[180,65]:[70,25]} mixBlur={.65} mixStrength={theme==='light'?1.2:2} mixContrast={1.1} mirror={.6} color={theme==='light'?'#b1c4ba':'#142322'} metalness={.75} roughness={.18} depthScale={.12} minDepthThreshold={.2} maxDepthThreshold={1.2} distortionMap={texture} distortion={.12}/></mesh>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.095,0]}><planeGeometry args={[18,18,64,64]}/><shaderMaterial uniforms={uniforms} vertexShader={waterVertex} fragmentShader={waterFragment} transparent depthWrite={false}/></mesh>
  </group>;
}
function Motes({animate,quality}) {
  const group=useRef(),time=useRef(0),positions=useMemo(()=>{const random=seeded(716);return Float32Array.from({length:(quality==='high'?220:100)*3},(_,i)=>(random()-.5)*(i%3===1?9:18)+(i%3===1?3:0));},[quality]);
  useFrame((_,dt)=>{if(animate){time.current+=Math.min(dt,.05);group.current.rotation.y=time.current*.015;group.current.position.y=Math.sin(time.current*.14)*.15;}});
  return <points ref={group}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions,3]}/></bufferGeometry><pointsMaterial size={.023} color="#d4efdf" transparent opacity={.6} depthWrite={false} blending={THREE.AdditiveBlending}/></points>;
}
function Droplets({curve,color,visible,animate,count=9}) {
  const mesh=useRef(),object=useMemo(()=>new THREE.Object3D(),[]),time=useRef(0),value=useRef(0);
  useFrame((_,dt)=>{const delta=Math.min(dt,.05);if(animate)time.current+=delta;value.current=animate?THREE.MathUtils.damp(value.current,visible?1:0,2,delta):Number(visible);for(let i=0;i<count;i++){const t=(time.current*.06+i/count)%1;object.position.copy(curve.getPoint(t));const s=(.018+Math.sin(t*Math.PI)*.018)*value.current;object.scale.setScalar(s);object.updateMatrix();mesh.current.setMatrixAt(i,object.matrix);}mesh.current.instanceMatrix.needsUpdate=true;});
  return <instancedMesh ref={mesh} args={[undefined,undefined,count]} frustumCulled={false}><sphereGeometry args={[1,8,6]}/><meshBasicMaterial color={color} toneMapped={false}/></instancedMesh>;
}
function Fruit({visible,animate,theme}) {
  const ref=useRef(),core=useRef(),time=useRef(0),scale=useRef(0);
  useFrame((_,dt)=>{const delta=Math.min(dt,.05);if(animate)time.current+=delta;scale.current=animate?THREE.MathUtils.damp(scale.current,visible?1:0,1.5,delta):Number(visible);ref.current.scale.setScalar(Math.max(.0001,scale.current));ref.current.position.y=4.65+Math.sin(time.current*.8)*.07;ref.current.rotation.y=time.current*.15;core.current.scale.setScalar(.83+Math.sin(time.current*1.3)*.06);});
  return <group ref={ref} position={[0,4.65,.3]}>
    <mesh><sphereGeometry args={[.43,48,48]}/><MeshDistortMaterial color={theme==='light'?'#fff0c5':'#eed6a0'} transmission={.92} thickness={1.5} roughness={.045} metalness={.06} ior={1.36} clearcoat={1} envMapIntensity={2.5} distort={.15} speed={animate?1.4:0}/></mesh>
    <mesh ref={core}><icosahedronGeometry args={[.17,2]}/><meshBasicMaterial color={[3.3,2.3,1.1]} toneMapped={false}/></mesh>
    <pointLight color="#ffdb99" intensity={visible?8:0} distance={8}/>
    {[0,1,2].map(i=><mesh key={i} rotation={[i*.6,.4+i*.8,.3+i*.5]}><torusGeometry args={[.66+i*.14,.004,6,96]}/><meshBasicMaterial color={TREE_COLORS[i]} transparent opacity={.55} toneMapped={false}/></mesh>)}
  </group>;
}
function Seed({animate,theme,dim}) {
  const group=useRef(),time=useRef(0);
  useFrame((_,dt)=>{if(animate)time.current+=Math.min(dt,.05);group.current.position.y=.2+Math.sin(time.current*.8)*.035;group.current.rotation.y=time.current*.12;});
  return <group ref={group} position={[0,.2,0]}>
    <mesh><sphereGeometry args={[.15,32,32]}/><meshPhysicalMaterial color="#e2fff0" roughness={.06} metalness={.2} transmission={.8} thickness={.5} ior={1.4} clearcoat={1} envMapIntensity={3}/></mesh>
    <mesh><sphereGeometry args={[.055,16,16]}/><meshBasicMaterial color={[1.5,2.3,1.8]} toneMapped={false}/></mesh><pointLight color="#baf0d2" intensity={dim?1:4} distance={5}/>
    {[0,1,2].map(i=><mesh key={i} rotation={[.4+i*.7,i*.9,.3+i*.4]}><torusGeometry args={[.25+i*.085,.003,5,80]}/><meshBasicMaterial color={TREE_COLORS[i]} transparent opacity={.4}/></mesh>)}
  </group>;
}
function GhostTree({model,visible}) {
  const lines=useMemo(()=>[...model.stems,...model.branches,...model.branches.flatMap(b=>b.twigs.filter((_,i)=>i%3===0))].map(d=>new THREE.BufferGeometry().setFromPoints(d.curve.getPoints(45))),[model]);
  useEffect(()=>()=>lines.forEach(g=>g.dispose()),[lines]);
  return <group visible={visible}>{lines.map((g,i)=><line key={i} geometry={g}><lineBasicMaterial color="#badaca" transparent opacity={.035} depthWrite={false}/></line>)}</group>;
}
function World(props) {
  const {built,phase,index,animate,reduced,theme,quality}=props,model=useMemo(makeTree,[]),rootDone=[0,1,2].every(i=>built.includes(i))&&!(phase==='growing'&&index===2);
  const materials=useMemo(()=>TREE_COLORS.map(color=>new THREE.MeshPhysicalMaterial({color:theme==='light'?'#d0e2d5':'#b4d7c9',roughness:.15,metalness:.16,transmission:.64,thickness:.45,ior:1.46,clearcoat:1,clearcoatRoughness:.05,iridescence:.22,iridescenceIOR:1.32,envMapIntensity:2.1,attenuationColor:color,attenuationDistance:2.5})),[theme]);
  const leaves=useMemo(()=>TREE_COLORS.map(color=>new THREE.MeshPhysicalMaterial({color,roughness:.09,metalness:.25,transmission:.5,thickness:.15,ior:1.4,clearcoat:1,iridescence:.3,envMapIntensity:1.8})),[]);
  useEffect(()=>()=>materials.forEach(m=>m.dispose()),[materials]);useEffect(()=>()=>leaves.forEach(m=>m.dispose()),[leaves]);
  const root=useRef(),time=useRef(0);
  useFrame((_,dt)=>{if(animate)time.current+=Math.min(dt,.05);root.current.rotation.z=Math.sin(time.current*.24)*.004;});
  return <>
    <color attach="background" args={[theme==='light'?'#e9eee7':'#061012']}/><fog attach="fog" args={[theme==='light'?'#e9eee7':'#061012',15,40]}/>
    <CameraRig {...{phase,index,animate,reduced}}/>
    <ambientLight intensity={theme==='light'?.9:.22}/><directionalLight position={[4,8,5]} color="#fff1d6" intensity={3}/><directionalLight position={[-5,4,-3]} color="#b0e1ff" intensity={2}/><spotLight position={[0,9,2]} angle={.5} penumbra={1} intensity={45} color="#e1f7da" distance={20}/>
    <group ref={root}>
      <GhostTree model={model} visible={phase==='intro'}/>
      {model.roots.map((data,i)=><GrowingTube key={`root-${i}`} data={data} target={built.includes(i)?1:0} material={materials[i]} animate={animate}/>)}
      {model.stems.map((data,i)=><GrowingTube key={`stem-${i}`} data={data} target={rootDone?1:0} material={materials[i]} animate={animate}/>)}
      {model.branches.map((branch,i)=><Branch key={i} branch={branch} visible={built.includes(branch.owner)} glass={materials[i%3]} leafMaterial={leaves[i%3]} animate={animate}/>)}
      {[...model.roots,...model.stems,...model.branches].map((data,i)=><Droplets key={i} curve={data.curve} color={data.color} visible={data.owner===-1?rootDone:built.includes(data.owner)} animate={animate}/>)}
      <Seed animate={animate} theme={theme} dim={built.length>2}/><Fruit visible={built.includes(8)} animate={animate} theme={theme}/>
    </group>
    <LiquidSurface {...{animate,theme,quality,built}}/><Motes animate={animate} quality={quality}/>
    <Environment resolution={quality==='high'?256:128}>
      <Lightformer intensity={5} position={[-4,6,4]} scale={[5,7,1]} color="#ffedcf"/>
      <Lightformer intensity={4} position={[5,3,-3]} rotation={[0,-Math.PI/2,0]} scale={[3,7,1]} color="#b9f5e0"/>
      <Lightformer intensity={3} position={[-3,4,-5]} rotation={[0,Math.PI,0]} scale={[3,5,1]} color="#b4c5ff"/>
      <Lightformer intensity={2} position={[0,9,0]} rotation={[Math.PI/2,0,0]} scale={[5,5,1]}/>
    </Environment>
    {quality==='high'&&<EffectComposer multisampling={0}><Bloom mipmapBlur intensity={.8} luminanceThreshold={1.1} luminanceSmoothing={.4}/><Vignette offset={.25} darkness={theme==='light'?.18:.48}/></EffectComposer>}
  </>;
}
class SceneBoundary extends Component {
  state={failed:false};static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(){this.props.onRenderer?.('compatibility');}
  render(){return this.state.failed?<FallbackScene {...this.props}/>:this.props.children;}
}
export default function Scene(props) {
  const [adaptive,setAdaptive]=useState(false),quality=props.quality==='eco'||adaptive?'eco':'high';
  return <SceneBoundary {...props}><Canvas className="tree-canvas" camera={{position:[5.8,3.1,10.2],fov:42,near:.1,far:80}} dpr={quality==='high'?[1,1.5]:1} frameloop={props.animate?'always':'demand'} gl={{antialias:quality==='eco',alpha:false,powerPreference:'high-performance',stencil:false}} fallback={<FallbackScene {...props}/>} onCreated={({gl})=>{gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=props.theme==='light'?1.1:1.2;props.onRenderer?.('webgl');}}>
    <PerformanceMonitor onDecline={()=>setAdaptive(true)} flipflops={2} onFallback={()=>setAdaptive(true)}/>
    <Suspense fallback={null}><World {...props} quality={quality}/></Suspense>
  </Canvas></SceneBoundary>;
}
