const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/web-Dd0sQx2w.js","assets/index-B3N1CnN-.js","assets/index-Dgv0MKem.css"])))=>i.map(i=>d[i]);
import{c as r,O as p,a$ as w}from"./index-B3N1CnN-.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v=r("Star",[["path",{d:"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",key:"r04s7s"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C=r("TrendingUp",[["polyline",{points:"22 7 13.5 15.5 8.5 10.5 2 17",key:"126l90"}],["polyline",{points:"16 7 22 7 22 13",key:"kwv8wd"}]]);function d(o){o.CapacitorUtils.Synapse=new Proxy({},{get(c,n){return new Proxy({},{get(f,a){return(s,l,i)=>{const t=o.Capacitor.Plugins[n];if(t===void 0){i(new Error(`Capacitor plugin ${n} not found`));return}if(typeof t[a]!="function"){i(new Error(`Method ${a} not found in Capacitor plugin ${n}`));return}(async()=>{try{const e=await t[a](s);l(e)}catch(e){i(e)}})()}}})}})}function u(o){o.CapacitorUtils.Synapse=new Proxy({},{get(c,n){return o.cordova.plugins[n]}})}function y(o=!1){typeof window>"u"||(window.CapacitorUtils=window.CapacitorUtils||{},window.Capacitor!==void 0&&!o?d(window):window.cordova!==void 0&&u(window))}const P=p("Geolocation",{web:()=>w(()=>import("./web-Dd0sQx2w.js"),__vite__mapDeps([0,1,2])).then(o=>new o.GeolocationWeb)});y();export{P as G,v as S,C as T};
