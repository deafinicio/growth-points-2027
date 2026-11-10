import { Component, Suspense, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer, Html, Edges } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'motion/react';
import { STAGES } from './content';

const POSITIONS = {
  pyramid: [[0, -1.23, 0], [0, .27, 0], [0, 1.82, 0]],
  orbit: [[-2.05, -.65, .1], [1.85, -.1, -.4], [0, 1.8, -.3]],
  trajectory: [[-2.15, -1.45, .1], [0, .2, 0], [1.8, 1.95, -.1]],
};
const SIZES = [[2.95, 2.14, .82], [1.94, 1.1, .83], [.98, .045, 1.12]];
const waveVertex = `varying vec2 vUv; uniform float uTime; void main(){ vUv=uv; vec3 p=position; float r=length(p.xy); p.z+=sin(r*2.8-uTime*.7)*.045; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`;
const waveFragment = `varying vec2 vUv; uniform float uTime; uniform vec3 uColor; uniform float uOpacity; void main(){ vec2 p=(vUv-.5)*2.; float r=length(p); float wobble=sin(atan(p.y,p.x)*5.+uTime*.15)*.02; float ring=pow(max(0.,sin((r+wobble)*64.-uTime*.45)),24.); float fade=smoothstep(1.,.15,r)*smoothstep(.1,.3,r); gl_FragColor=vec4(uColor,ring*fade*uOpacity); }`;
function Waves({ theme, animate }) {
  const material = useRef();
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uColor: { value: new THREE.Color(theme === 'dark' ? '#7da295' : '#437c72') }, uOpacity: { value: theme === 'dark' ? .34 : .25 } }), [theme]);
  useFrame(({ clock }) => { if (animate && material.current) material.current.uniforms.uTime.value = clock.elapsedTime; });
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.23, 0]}><planeGeometry args={[13, 13, 50, 50]} /><shaderMaterial ref={material} uniforms={uniforms} vertexShader={waveVertex} fragmentShader={waveFragment} transparent depthWrite={false} side={THREE.DoubleSide} /></mesh>;
}
function Dust({ animate, theme }) {
  const group = useRef();
  const positions = useMemo(() => {
    const data = new Float32Array(65 * 3);
    let seed = 23;
    const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < data.length; i += 3) { data[i] = (random() - .5) * 10; data[i + 1] = random() * 6 - 2; data[i + 2] = (random() - .5) * 7; }
    return data;
  }, []);
  useFrame((_, dt) => { if (animate) group.current.rotation.y += Math.min(dt, .05) * .025; });
  return <points ref={group}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><pointsMaterial color={theme === 'dark' ? '#d2d8dc' : '#637a75'} size={.026} transparent opacity={.65} sizeAttenuation /></points>;
}
function Level({ index, layout, theme, animate, selected, setSelected, onOpen, levels }) {
  const group = useRef();
  const [hovered, setHovered] = useState(false);
  const stage = STAGES[index];
  const [bottom, top, height] = SIZES[index];
  const target = useMemo(() => new THREE.Vector3(...POSITIONS[layout][index]), [layout, index]);
  useFrame(({ clock, invalidate }, delta) => {
    if (!group.current) return;
    const rate = 1 - Math.exp(-Math.min(delta, .05) * 5);
    const offset = animate ? Math.sin(clock.elapsedTime * .65 + index * .9) * .055 : 0;
    const desired = target.clone(); desired.y += offset;
    if (animate) group.current.position.lerp(desired, rate); else group.current.position.copy(desired);
    const s = layout === 'orbit' ? .73 : 1;
    const scale = index >= levels ? .001 : s * (hovered ? 1.035 : 1);
    group.current.scale.lerp(new THREE.Vector3(scale, scale, scale), animate ? rate : 1);
    if (!animate && group.current.position.distanceTo(desired) > .001) invalidate();
  });
  const bright = hovered || selected === index;
  return <group ref={group} position={POSITIONS[layout][index]}>
    <mesh rotation={[0, Math.PI / 4, 0]} onClick={e => { e.stopPropagation(); onOpen(index); }} onPointerOver={e => { e.stopPropagation(); setHovered(true); setSelected(index); document.body.style.cursor = 'pointer'; }} onPointerOut={() => { setHovered(false); setSelected(null); document.body.style.cursor = ''; }}>
      <cylinderGeometry args={[top, bottom, height, 4, 1]} />
      <meshPhysicalMaterial color={stage.color} metalness={theme === 'dark' ? .54 : .32} roughness={.24} clearcoat={1} clearcoatRoughness={.16} emissive={stage.color} emissiveIntensity={bright ? .25 : .045} envMapIntensity={1.35} />
      <Edges threshold={12} color={bright ? '#ffffff' : stage.color} transparent opacity={bright ? .95 : .5} />
    </mesh>
    <mesh position={[0, -height / 2 - .035, 0]} rotation={[0, Math.PI / 4, 0]}>
      <cylinderGeometry args={[bottom * .995, bottom * .995, .04, 4]} /><meshBasicMaterial color={stage.color} transparent opacity={.32} />
    </mesh>
    {index < levels && <Html position={[index === 2 ? 1.1 : bottom * .8, index === 2 ? .25 : .05, .5]} center zIndexRange={[12, 1]}>
      <button className={`scene-label ${bright ? 'is-lit' : ''}`} style={{ '--level': stage.color }} onClick={() => onOpen(index)} onMouseEnter={() => setSelected(index)} onMouseLeave={() => setSelected(null)} aria-label={`Відкрити етап ${stage.month}`}>
        <span className="scene-label-dot" /><span><b>{stage.month}</b><small>{stage.short}</small></span><span className="scene-label-index">{stage.number}</span>
      </button>
    </Html>}
  </group>;
}
function Assembly({ layout, theme, animate, selected, setSelected, onOpen, focus, levels }) {
  const root = useRef();
  useFrame(({ pointer }, dt) => {
    if (!animate) return;
    root.current.rotation.y = THREE.MathUtils.damp(root.current.rotation.y, pointer.x * .1, 3, dt);
    root.current.rotation.x = THREE.MathUtils.damp(root.current.rotation.x, -pointer.y * .035, 3, dt);
  });
  return <group ref={root} scale={focus ? .92 : 1}>
    {STAGES.map((_, i) => <Level key={i} index={i} {...{ layout, theme, animate, selected, setSelected, onOpen, levels }} />)}
    <mesh position={[0, -.1, 0]}><cylinderGeometry args={[.012, .012, 5.1, 8]} /><meshBasicMaterial color={theme === 'dark' ? '#d5d8e3' : '#648078'} transparent opacity={.2} /></mesh>
    <mesh position={[0, 2.76, 0]}><octahedronGeometry args={[.1, 0]} /><meshBasicMaterial color="#eae7e1" /></mesh>
    <Waves theme={theme} animate={animate} />
    <Dust theme={theme} animate={animate} />
    <Environment resolution={128}>
      <Lightformer intensity={3.5} position={[-4, 6, 4]} scale={[7, 7, 1]} color="#ffffff" />
      <Lightformer intensity={2} position={[5, 2, -3]} rotation={[0, Math.PI / 2, 0]} scale={[5, 5, 1]} color="#bcd7ff" />
      <Lightformer intensity={1.5} position={[-3, 0, -5]} scale={[5, 4, 1]} color="#ffc2a5" />
    </Environment>
  </group>;
}
function Fallback({ onOpen, layout = 'pyramid', levels = 3 }) {
  const project = ([x, y, z]) => [280 + (x - z) * 53, 240 + (x + z) * 15 - y * 66];
  function faces(i) {
    const pos = POSITIONS[layout][i];
    const scale = layout === 'orbit' ? .7 : 1;
    const [bottom, top, h] = SIZES[i];
    const make = (r, y) => [[-r, y, -r], [r, y, -r], [r, y, r], [-r, y, r]].map(p => project(p.map((v, k) => v * scale + pos[k])));
    const lower = make(bottom * .71, -h / 2), upper = make(top * .71, h / 2);
    return [upper, [upper[3], upper[2], lower[2], lower[3]], [upper[2], upper[1], lower[1], lower[2]]].map(f => f.map(p => p.join(',')).join(' '));
  }
  return <div className="svg-scene" aria-label="Просторова схема етапів">
    <svg viewBox="0 0 560 460" className="fallback-svg" aria-hidden="true">
      <defs>{STAGES.map((s, i) => <ReactFragment key={i}>{[0, 1, 2].map((f) => <linearGradient key={f} id={`face-${i}-${f}`} x1="0" y1="0" x2={f === 2 ? '100%' : '30%'} y2="100%"><stop offset="0%" stopColor={s.color} stopOpacity={f === 0 ? .9 : .65}/><stop offset="100%" stopColor={f === 2 ? '#242d39' : s.color} stopOpacity={f === 0 ? .45 : .15}/></linearGradient>)}</ReactFragment>)}</defs>
      <g className="svg-ripples">{[0,1,2,3,4,5,6,7].map(i => <ellipse key={i} cx="280" cy="370" rx={90+i*22} ry={20+i*5} fill="none" stroke="currentColor" strokeWidth=".7" opacity={.16-i*.015}/>)}</g>
      <path d="M280 65V365" stroke="currentColor" strokeOpacity=".18" strokeDasharray="2 7"/>
      {STAGES.map((s,i) => <motion.g key={s.id} animate={{opacity: i < levels ? 1 : 0, y: i < levels ? 0 : -20}} transition={{duration:.5}}>{faces(i).map((points, f) => <motion.polygon key={f} animate={{points}} transition={{duration:1.1,ease:[.22,1,.36,1]}} fill={`url(#face-${i}-${f})`} stroke={s.color} strokeWidth=".7" strokeOpacity=".8"/>)}</motion.g>)}
    </svg>
    <div className={`svg-labels layout-${layout}`}>{STAGES.map((s, i) => i < levels && <button key={s.id} className={`scene-label svg-label svg-label-${i}`} style={{'--level': s.color}} onClick={() => onOpen(i)}><span className="scene-label-dot"/><span><b>{s.month}</b><small>{s.short}</small></span><span className="scene-label-index">{s.number}</span></button>)}</div>
  </div>;
}
function ReactFragment({children}) { return <>{children}</>; }
class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { document.body.style.cursor = ''; }
  render() { return this.state.failed ? <Fallback {...this.props} /> : this.props.children; }
}
export default function Scene({ layout, theme, animate, selected, setSelected, onOpen, focus, levels }) {
  return <SceneBoundary {...{onOpen, layout, levels}}><Canvas camera={{ position: [7, 4.1, 8.8], fov: 37 }} dpr={[1, 1.65]} frameloop={animate ? 'always' : 'demand'} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }} fallback={<Fallback {...{onOpen, layout, levels}} />} onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.15; }}>
    <ambientLight intensity={theme === 'dark' ? .8 : 1.4} /><directionalLight position={[3, 6, 5]} intensity={2.5} color="#ffffff" />
    <Suspense fallback={null}><Assembly {...{ layout, theme, animate, selected, setSelected, onOpen, focus, levels }} /></Suspense>
  </Canvas></SceneBoundary>;
}
