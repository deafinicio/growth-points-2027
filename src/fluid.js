// A compact stable-fluids solver: pressure projection, semi-Lagrangian
// advection, velocity dissipation and RGB dye transport on a periodic grid.
export class FluidField {
  constructor(size = 56) {
    this.size = size; this.length = size * size;
    for (const key of ['u','v','u0','v0','pressure','pressure0','divergence','r','g','b','r0','g0','b0']) this[key] = new Float32Array(this.length);
    this.pixels = new Uint8Array(this.length * 4);
  }
  index(x,y) { const n=this.size; return ((y%n+n)%n)*n+((x%n+n)%n); }
  sample(field,x,y) {
    const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
    return field[this.index(ix,iy)]*(1-fx)*(1-fy)+field[this.index(ix+1,iy)]*fx*(1-fy)+field[this.index(ix,iy+1)]*(1-fx)*fy+field[this.index(ix+1,iy+1)]*fx*fy;
  }
  splat(x,y,dx,dy,color,radius=2.5) {
    const cx=x*this.size,cy=y*this.size,range=Math.ceil(radius*2);
    for(let j=-range;j<=range;j++) for(let i=-range;i<=range;i++) {
      const weight=Math.exp(-(i*i+j*j)/(radius*radius)),k=this.index(Math.floor(cx+i),Math.floor(cy+j));
      this.u[k]+=dx*weight;this.v[k]+=dy*weight;
      this.r[k]=Math.min(4,this.r[k]+color[0]*weight*.18);this.g[k]=Math.min(4,this.g[k]+color[1]*weight*.18);this.b[k]=Math.min(4,this.b[k]+color[2]*weight*.18);
    }
  }
  project(iterations=14) {
    const n=this.size; this.pressure.fill(0);this.pressure0.fill(0);
    for(let y=0;y<n;y++) for(let x=0;x<n;x++) {const k=y*n+x;this.divergence[k]=-.5*(this.u[this.index(x+1,y)]-this.u[this.index(x-1,y)]+this.v[this.index(x,y+1)]-this.v[this.index(x,y-1)]);}
    for(let it=0;it<iterations;it++) {
      for(let y=0;y<n;y++) for(let x=0;x<n;x++) {const k=y*n+x;this.pressure0[k]=(this.divergence[k]+this.pressure[this.index(x-1,y)]+this.pressure[this.index(x+1,y)]+this.pressure[this.index(x,y-1)]+this.pressure[this.index(x,y+1)])*.25;}
      [this.pressure,this.pressure0]=[this.pressure0,this.pressure];
    }
    for(let y=0;y<n;y++) for(let x=0;x<n;x++) {const k=y*n+x;this.u[k]-=.5*(this.pressure[this.index(x+1,y)]-this.pressure[this.index(x-1,y)]);this.v[k]-=.5*(this.pressure[this.index(x,y+1)]-this.pressure[this.index(x,y-1)]);}
  }
  advect(output,input,dt,damping,u=this.u,v=this.v) {
    const n=this.size;
    for(let y=0;y<n;y++) for(let x=0;x<n;x++) {const k=y*n+x; output[k]=this.sample(input,x-u[k]*dt,y-v[k]*dt)*damping;}
  }
  step(dt=.65) {
    this.project();this.u0.set(this.u);this.v0.set(this.v);
    this.advect(this.u,this.u0,dt,.987,this.u0,this.v0);this.advect(this.v,this.v0,dt,.987,this.u0,this.v0);this.project(8);
    for(const channel of ['r','g','b']) {this[`${channel}0`].set(this[channel]);this.advect(this[channel],this[`${channel}0`],dt,.988);}
    for(let i=0;i<this.length;i++) {const k=i*4;this.pixels[k]=Math.min(255,this.r[i]*135);this.pixels[k+1]=Math.min(255,this.g[i]*135);this.pixels[k+2]=Math.min(255,this.b[i]*135);this.pixels[k+3]=255;}
    return this.pixels;
  }
  drive(time, intensity=1) {
    const colors=[[1,.38,.2],[.2,1,.7],[.57,.35,1]];
    for(let i=0;i<3;i++) {const a=time*.2+i*Math.PI*2/3;const r=.19+.05*Math.sin(time*.28+i);this.splat(.5+Math.cos(a)*r,.5+Math.sin(a)*r,-Math.sin(a)*1.7*intensity,Math.cos(a)*1.7*intensity,colors[i],2);}
  }
}
