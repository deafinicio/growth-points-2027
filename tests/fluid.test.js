import test from 'node:test';
import assert from 'node:assert/strict';
import {FluidField} from '../src/fluid.js';
const divergence=f=>{let sum=0;for(let y=0;y<f.size;y++)for(let x=0;x<f.size;x++){const d=f.u[f.index(x+1,y)]-f.u[f.index(x-1,y)]+f.v[f.index(x,y+1)]-f.v[f.index(x,y-1)];sum+=d*d;}return Math.sqrt(sum/f.length);};
test('pressure projection reduces divergence of injected velocity',()=>{
  const f=new FluidField(24);f.splat(.4,.4,3,-2,[1,.5,.2]);const before=divergence(f);f.project(40);assert.ok(divergence(f)<before*.8);
});
test('fluid advection stays finite and transports colored dye over many steps',()=>{
  const f=new FluidField(24);f.splat(.5,.5,2,1,[1,.5,.2]);const initial=f.r.slice();for(let i=0;i<120;i++){f.drive(i*.06);f.step(.6);}
  for(const key of ['u','v','r','g','b'])assert.ok(f[key].every(Number.isFinite));
  assert.ok(f.r.some((v,i)=>Math.abs(v-initial[i])>.01));assert.ok(f.pixels.some(v=>v>0));assert.ok(Math.max(...f.r)<=4);
});
test('periodic sampling remains continuous across grid boundaries',()=>{
  const f=new FluidField(8);f.r.fill(.75);assert.equal(f.sample(f.r,-.5,10.2),.75);assert.equal(f.index(-1,0),7);
});
