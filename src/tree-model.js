import * as THREE from 'three';
export const TREE_COLORS = ['#f7b486','#78e2c3','#bcadff'];
export function seeded(seed) { return () => { seed=(seed*16807)%2147483647;return (seed-1)/2147483646; }; }
const curve = points => new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
export function makeTree() {
  const random=seeded(9037), roots=[], stems=[], branches=[];
  for(let i=0;i<3;i++) {
    const a=i*Math.PI*2/3+.2;
    roots.push({curve:curve([[0,.12,0],[Math.cos(a)*.7,.05,Math.sin(a)*.7],[Math.cos(a+.15)*1.7,-.01,Math.sin(a+.15)*1.7],[Math.cos(a)*3.25,-.06,Math.sin(a)*3.25]]), color:TREE_COLORS[i], radius:.13, owner:i});
    const points=[];for(let j=0;j<=18;j++){const t=j/18,ang=a+t*3.4;points.push([Math.sin(ang)*(.22-t*.1),t*3.1,Math.cos(ang)*(.22-t*.1)]);}
    stems.push({curve:curve(points),color:TREE_COLORS[i],radius:.13,owner:-1});
  }
  for(let i=0;i<5;i++) {
    const a=i*2.399963+.3, start=1.55+i*.2, height=4.1+random()*.9, reach=2.25+random()*.7;
    const b=curve([[Math.sin(a)*.12,start,Math.cos(a)*.12],[Math.cos(a)*.7,start+.3,Math.sin(a)*.7],[Math.cos(a+.12)*reach*.74,height-.8,Math.sin(a+.12)*reach*.74],[Math.cos(a)*reach,height,Math.sin(a)*reach]]);
    const twigs=[],leaves=[];
    for(let j=0;j<10;j++) {
      const t=.3+j*.065,p=b.getPoint(t),side=j%2===0?1:-1;
      const angle=a+side*(.55+random()*.7),length=.65+random()*.8;
      const end=p.clone().add(new THREE.Vector3(Math.cos(angle)*length,.55+random()*.7,Math.sin(angle)*length));
      const mid=p.clone().lerp(end,.5);mid.y-=.12;
      twigs.push({curve:new THREE.CatmullRomCurve3([p,mid,end]),radius:.025+(1-t)*.025,owner:i+3,color:TREE_COLORS[i%3],delay:t*.6});
      for(let k=0;k<10;k++) {
        const lt=.4+random()*.6,lp=twigs[j].curve.getPoint(lt);const offset=new THREE.Vector3((random()-.5)*.5,(random()-.35)*.38,(random()-.5)*.5);lp.add(offset);
        leaves.push({position:lp,rotation:[random()*Math.PI,random()*Math.PI,random()*Math.PI],scale:[.06+random()*.035,.16+random()*.13,.025+random()*.02],delay:t*.45+lt*.35,seed:random()});
      }
    }
    branches.push({curve:b,radius:.1,twigs,leaves,owner:i+3,color:TREE_COLORS[i%3]});
  }
  return {roots,stems,branches};
}
export function taperedTube(path,radius,segments=56,sides=7) {
  const geometry=new THREE.TubeGeometry(path,segments,radius,sides,false);
  const positions=geometry.attributes.position, centers=[];
  for(let i=0;i<=segments;i++)centers.push(path.getPointAt(i/segments));
  for(let i=0;i<=segments;i++) {const t=i/segments, taper=.16+.84*Math.pow(1-t,.7),c=centers[i];for(let j=0;j<=sides;j++){const k=i*(sides+1)+j;positions.setXYZ(k,c.x+(positions.getX(k)-c.x)*taper,c.y+(positions.getY(k)-c.y)*taper,c.z+(positions.getZ(k)-c.z)*taper);}}
  geometry.computeVertexNormals();return geometry;
}
