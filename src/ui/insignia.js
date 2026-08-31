const SVG_NS="http://www.w3.org/2000/svg";
function el(name,attrs={}){const node=document.createElementNS(SVG_NS,name);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));return node;}
function groupSvg(viewBox="0 0 120 48"){const svg=el("svg",{viewBox,"aria-hidden":"true",focusable:"false"});svg.classList.add("insignia-svg");return svg;}
function addWing(svg,side){const g=el("g",{transform:side==="left"?"":"translate(120 0) scale(-1 1)"});const path=el("path",{d:"M8 27 C22 14 36 12 52 17 C40 19 31 24 23 32 C35 28 44 27 52 28 C40 34 28 37 12 35 Z",fill:"currentColor"});g.append(path);svg.append(g);}
function badgeParachutist(){const svg=groupSvg();addWing(svg,"left");addWing(svg,"right");svg.append(el("path",{d:"M60 6 C49 6 42 13 42 20 H78 C78 13 71 6 60 6 Z",fill:"none",stroke:"currentColor","stroke-width":"3"}),el("path",{d:"M45 20 L57 36 M75 20 L63 36 M60 20 V37",stroke:"currentColor","stroke-width":"2",fill:"none"}),el("path",{d:"M54 37 H66 L63 42 H57 Z",fill:"currentColor"}));return svg;}
function rifleWreath(combat=false){const svg=groupSvg();svg.append(el("path",{d:"M29 36 C16 29 15 15 28 9 M91 36 C104 29 105 15 92 9",stroke:"currentColor","stroke-width":"4",fill:"none","stroke-linecap":"round"}),el("path",{d:"M37 30 L83 16 M39 16 L81 30",stroke:"currentColor","stroke-width":"4","stroke-linecap":"round"}));if(combat)svg.append(el("rect",{x:44,y:8,width:32,height:8,rx:2,fill:"currentColor"}));return svg;}
function badgeAirAssault(){const svg=groupSvg();addWing(svg,"left");addWing(svg,"right");svg.append(el("path",{d:"M58 9 H64 L66 20 L75 25 L72 29 L64 26 L62 39 H58 L56 26 L48 29 L45 25 L54 20 Z",fill:"currentColor"}));return svg;}
function qualificationBadge(result="marksman",clasp="RIFLE"){const svg=groupSvg("0 0 120 70");const shape=result==="expert"?"M60 6 L76 18 L70 40 H50 L44 18 Z":result==="sharpshooter"?"M60 6 L77 19 L70 39 H50 L43 19 Z":"M60 7 L73 18 L68 38 H52 L47 18 Z";svg.append(el("path",{d:shape,fill:"none",stroke:"currentColor","stroke-width":"4"}),el("rect",{x:35,y:47,width:50,height:14,rx:2,fill:"none",stroke:"currentColor","stroke-width":"3"}));const t=el("text",{x:60,y:57,"text-anchor":"middle","font-size":"9","font-weight":"800",fill:"currentColor"});t.textContent=clasp;svg.append(t);return svg;}
function ribbon(pattern=[]){const svg=groupSvg("0 0 120 36");const colors=pattern.length?pattern:["#777"];const width=120/colors.length;colors.forEach((fill,index)=>svg.append(el("rect",{x:index*width,y:0,width:width+.2,height:36,fill})));svg.append(el("rect",{x:.8,y:.8,width:118.4,height:34.4,fill:"none",stroke:"rgba(255,255,255,.42)","stroke-width":"1.6"}));return svg;}
function tab(text="TAB"){const svg=groupSvg("0 0 120 36");svg.append(el("path",{d:"M10 25 Q60 4 110 25 L106 34 Q60 16 14 34 Z",fill:"#111",stroke:"currentColor","stroke-width":"2"}));const t=el("text",{x:60,y:26,"text-anchor":"middle","font-size":"14","font-weight":"900",fill:"#fff","letter-spacing":"2"});t.textContent=text;svg.append(t);return svg;}
export function createInsignia(definition,{qualificationResult=null,badgeClasp=null}={}){let svg;if(qualificationResult)svg=qualificationBadge(qualificationResult,badgeClasp??"RIFLE");else{const display=definition?.display??{};if(display.kind==="ribbon")svg=ribbon(display.ribbonPattern);else if(display.iconId==="badge_parachutist_basic")svg=badgeParachutist();else if(display.iconId==="badge_combat_infantry")svg=rifleWreath(true);else if(display.iconId==="badge_expert_infantry")svg=rifleWreath(false);else if(display.iconId==="badge_air_assault")svg=badgeAirAssault();else if(display.kind==="tab")svg=tab(display.text??definition.shortName??definition.name);else svg=groupSvg();}const wrapper=document.createElement("span");wrapper.className=`insignia insignia-${definition?.display?.kind??(qualificationResult?"badge":"unknown")}`;wrapper.append(svg);wrapper.title=definition?.name??`${qualificationResult} qualification`;return wrapper;}

function addText(svg,{x,y,text,size=14,weight=800,fill="currentColor",anchor="middle",family="system-ui, sans-serif",letterSpacing=0}){
  const node=el("text",{x,y,"text-anchor":anchor,"font-size":size,"font-weight":weight,fill,"font-family":family,"letter-spacing":letterSpacing});
  node.textContent=text;svg.append(node);return node;
}
function unitPatch82d(){const svg=groupSvg("0 0 140 170");svg.append(el("path",{d:"M29 4 H111 Q119 4 119 12 V34 H21 V12 Q21 4 29 4Z",fill:"#263e78"}));addText(svg,{x:70,y:25,text:"AIRBORNE",size:13,fill:"#fff"});svg.append(el("rect",{x:20,y:43,width:100,height:100,rx:7,fill:"#c72b34",stroke:"#111","stroke-width":3}),el("circle",{cx:70,cy:93,r:37,fill:"#243f83"}));addText(svg,{x:70,y:108,text:"AA",size:48,weight:900,fill:"#fff",family:"Arial, sans-serif"});return svg;}
function unitPatch7th(){const svg=groupSvg("0 0 140 140");svg.append(el("circle",{cx:70,cy:70,r:61,fill:"#506040"}),el("circle",{cx:70,cy:70,r:54,fill:"#c83332"}),el("path",{d:"M40 33 L100 33 L70 70 Z M40 107 L100 107 L70 70 Z",fill:"#111"}));return svg;}
function unitPatch5th(){const svg=groupSvg("0 0 140 160");svg.append(el("path",{d:"M70 8 L120 80 L70 152 L20 80 Z",fill:"#c7222f",stroke:"#7e1018","stroke-width":3}));return svg;}
function unitPatch193d(){const svg=groupSvg("0 0 140 170");svg.append(el("path",{d:"M36 8 H104 Q118 8 118 22 V148 Q118 162 104 162 H36 Q22 162 22 148 V22 Q22 8 36 8Z",fill:"#1f57a6",stroke:"#fff","stroke-width":8}),el("rect",{x:58,y:8,width:24,height:154,fill:"#fff"}),el("path",{d:"M66 25 L74 43 L72 123 L78 136 L72 140 L70 132 L68 140 L62 136 L68 123 L66 43 Z",fill:"#cf2e36"}));return svg;}
function unitPatch75th(){const svg=groupSvg("0 0 220 90");svg.append(el("path",{d:"M18 18 Q110 -2 202 18 L193 58 Q110 39 27 58 Z",fill:"#080808",stroke:"#b6262d","stroke-width":5}));addText(svg,{x:110,y:38,text:"75 RANGER RGT",size:17,fill:"#fff",family:"Arial, sans-serif"});return svg;}
function unitPatch7thSfg(){const svg=groupSvg("0 0 140 180");svg.append(el("path",{d:"M30 2 H110 Q118 2 118 10 V32 H22 V10 Q22 2 30 2Z",fill:"#090909"}));addText(svg,{x:70,y:23,text:"AIRBORNE",size:12,fill:"#e3c24d"});svg.append(el("path",{d:"M70 40 L124 94 L70 169 L16 94 Z",fill:"#2e7478",stroke:"#123c3f","stroke-width":3}),el("path",{d:"M66 60 L74 60 L74 122 L83 133 L70 158 L57 133 L66 122 Z",fill:"#e6c247"}),el("path",{d:"M31 81 L55 68 L48 83 L61 80 L40 100 L46 85 Z",fill:"#e6c247"}),el("path",{d:"M42 102 L68 85 L59 103 L74 98 L50 122 L56 105 Z",fill:"#e6c247"}),el("path",{d:"M56 118 L85 99 L73 120 L91 113 L62 139 L69 120 Z",fill:"#e6c247"}));return svg;}
function campaignShield(){const svg=groupSvg("0 0 120 150");svg.append(el("path",{d:"M60 5 L108 22 V79 C108 111 88 132 60 145 C32 132 12 111 12 79 V22 Z",fill:"#303a2b",stroke:"#d2bd68","stroke-width":5}),el("path",{d:"M23 94 L47 61 L60 76 L75 51 L99 94 Z",fill:"#87947b"}),el("path",{d:"M64 38 L82 68 H71 L87 98 L63 84 L43 98 L57 68 H47 Z",fill:"#d2bd68"}),el("circle",{cx:60,cy:38,r:6,fill:"#e7e8df"}));return svg;}
function campaignViper(){const svg=groupSvg("0 0 120 150");svg.append(el("path",{d:"M60 4 L110 29 L102 111 L60 146 L18 111 L10 29 Z",fill:"#242b26",stroke:"#8e9b88","stroke-width":5}),el("path",{d:"M33 50 C49 28 80 27 91 45 C100 61 87 75 71 76 C56 77 48 87 53 101 C58 113 75 113 83 103",fill:"none",stroke:"#b7c2b1","stroke-width":10,"stroke-linecap":"round"}),el("path",{d:"M81 40 L98 33 L92 50 Z",fill:"#d0b85e"}),el("circle",{cx:87,cy:44,r:3.5,fill:"#161916"}),el("path",{d:"M33 112 L88 112",stroke:"#d0b85e","stroke-width":5}));return svg;}
function campaignFalcon(){const svg=groupSvg("0 0 120 150");svg.append(el("path",{d:"M60 5 L112 38 L95 116 L60 145 L25 116 L8 38 Z",fill:"#31352f",stroke:"#c6a74b","stroke-width":5}),el("path",{d:"M58 49 C40 33 25 36 16 44 C31 48 40 59 46 70 C32 66 22 69 14 77 C33 78 46 86 58 97 Z",fill:"#c7cdc4"}),el("path",{d:"M62 49 C80 33 95 36 104 44 C89 48 80 59 74 70 C88 66 98 69 106 77 C87 78 74 86 62 97 Z",fill:"#c7cdc4"}),el("path",{d:"M60 30 L67 101 L60 121 L53 101 Z",fill:"#c8aa4f"}),el("path",{d:"M50 101 L70 101",stroke:"#d7c46f","stroke-width":5}));return svg;}
function campaignEmber(){const svg=groupSvg("0 0 120 150");svg.append(el("circle",{cx:60,cy:70,r:55,fill:"#282d28",stroke:"#9ca79a","stroke-width":5}),el("path",{d:"M60 18 C74 41 83 53 78 69 C75 79 69 84 60 91 C64 77 56 72 53 64 C49 54 53 42 60 18 Z",fill:"#bd6d3c"}),el("path",{d:"M60 48 C69 62 70 70 60 81 C53 73 53 64 60 48 Z",fill:"#dfb95d"}),el("path",{d:"M28 100 L92 100",stroke:"#b9c2b6","stroke-width":6}),el("path",{d:"M37 112 L83 112",stroke:"#7e897d","stroke-width":4}));return svg;}
function campaignAnvil(){const svg=groupSvg("0 0 120 150");svg.append(el("path",{d:"M60 5 L106 30 L106 91 L60 141 L14 91 L14 30 Z",fill:"#222522",stroke:"#a68c45","stroke-width":5}),el("path",{d:"M32 51 H87 L78 64 H69 V82 H86 L96 95 H24 L34 82 H52 V64 H41 Z",fill:"#b9c0b8"}),el("path",{d:"M60 22 L65 37 L81 37 L68 46 L73 61 L60 52 L47 61 L52 46 L39 37 L55 37 Z",fill:"#c7ad57"}));return svg;}
function campaignRedHorizon(){const svg=groupSvg("0 0 120 150");svg.append(el("path",{d:"M60 5 L108 24 V81 C108 110 88 131 60 145 C32 131 12 110 12 81 V24 Z",fill:"#302927",stroke:"#a8aa9f","stroke-width":5}),el("circle",{cx:60,cy:63,r:25,fill:"#9f493a"}),el("path",{d:"M23 87 C40 73 80 73 97 87",fill:"none",stroke:"#d0b65d","stroke-width":6}),el("path",{d:"M23 99 H97",stroke:"#727d70","stroke-width":5}),el("path",{d:"M60 28 L65 43 L81 43 L68 52 L73 67 L60 58 L47 67 L52 52 L39 43 L55 43 Z",fill:"#dedfd7"}));return svg;}


function enlistedChevronSvg({chevrons=0,rockers=0,center=null}={}){
  const svg=groupSvg("0 0 120 120");
  const stroke="#d7c66a";
  for(let i=0;i<chevrons;i++){
    const y=20+i*12;
    svg.append(el("path",{d:`M22 ${y+17} L60 ${y} L98 ${y+17}`,fill:"none",stroke,"stroke-width":9,"stroke-linejoin":"miter","stroke-linecap":"square"}));
  }
  for(let i=0;i<rockers;i++){
    const y=82-i*12;
    svg.append(el("path",{d:`M25 ${y} Q60 ${y+20} 95 ${y}`,fill:"none",stroke,"stroke-width":8,"stroke-linecap":"square"}));
  }
  if(center==="diamond")svg.append(el("path",{d:"M60 52 L73 66 L60 80 L47 66 Z",fill:stroke}));
  return svg;
}
function specialistSvg(){
  const svg=groupSvg("0 0 120 120");
  const gold="#d7c66a";
  svg.append(el("path",{d:"M60 10 L101 37 L88 96 L60 111 L32 96 L19 37 Z",fill:"none",stroke:gold,"stroke-width":7}),el("path",{d:"M60 30 L66 46 L84 46 L70 56 L76 73 L60 63 L44 73 L50 56 L36 46 L54 46 Z",fill:gold}),el("path",{d:"M40 84 Q60 70 80 84",fill:"none",stroke:gold,"stroke-width":6}));
  return svg;
}
function officerBarSvg({count=1,gold=false}={}){
  const svg=groupSvg("0 0 120 120");
  const fill=gold?"#d2aa3a":"#d9ddd8", stroke=gold?"#6d5515":"#727872";
  const w=count===1?30:24, gap=12, total=count*w+(count-1)*gap, start=(120-total)/2;
  for(let i=0;i<count;i++)svg.append(el("rect",{x:start+i*(w+gap),y:20,width:w,height:80,rx:2,fill,stroke,"stroke-width":3}));
  return svg;
}
function rankSvg(rank){
  switch(rank?.id){
    case "rank_army_e1": { const svg=groupSvg("0 0 120 120"); svg.append(el("circle",{cx:60,cy:60,r:26,fill:"none",stroke:"currentColor","stroke-width":3,"stroke-dasharray":"5 6",opacity:.35})); return svg; }
    case "rank_army_e2": return enlistedChevronSvg({chevrons:1});
    case "rank_army_e3": return enlistedChevronSvg({chevrons:1,rockers:1});
    case "rank_army_e4": return specialistSvg();
    case "rank_army_e5": return enlistedChevronSvg({chevrons:3});
    case "rank_army_e6": return enlistedChevronSvg({chevrons:3,rockers:1});
    case "rank_army_e7": return enlistedChevronSvg({chevrons:3,rockers:2});
    case "rank_army_e8": return enlistedChevronSvg({chevrons:3,rockers:3,center:"diamond"});
    case "rank_army_o1": return officerBarSvg({count:1,gold:true});
    case "rank_army_o2": return officerBarSvg({count:1,gold:false});
    case "rank_army_o3": return officerBarSvg({count:2,gold:false});
    default: return groupSvg("0 0 120 120");
  }
}
export function createRankInsignia(rank){
  const wrapper=document.createElement("span");
  wrapper.className="rank-insignia";
  wrapper.dataset.rankId=rank?.id??"unknown";
  wrapper.append(rankSvg(rank));
  wrapper.title=rank?`${rank.name} (${rank.abbreviation})`:"Rank insignia";
  wrapper.setAttribute("role","img");
  wrapper.setAttribute("aria-label",wrapper.title);
  return wrapper;
}

export function createNamedInsignia(insigniaId,{title=null}={}){
  const builders={
    ssi_82d_airborne:unitPatch82d,ssi_7th_infantry:unitPatch7th,ssi_5th_infantry:unitPatch5th,ssi_193d_infantry:unitPatch193d,ssi_75th_ranger:unitPatch75th,ssi_7th_special_forces:unitPatch7thSfg,
    campaign_northern_shield:campaignShield,campaign_iron_viper:campaignViper,campaign_falcon_spear:campaignFalcon,campaign_ember_watch:campaignEmber,campaign_night_anvil:campaignAnvil,campaign_red_horizon:campaignRedHorizon
  };
  const svg=(builders[insigniaId]??(()=>groupSvg()))();
  const wrapper=document.createElement("span");wrapper.className="named-insignia";wrapper.dataset.insigniaId=insigniaId??"unknown";wrapper.append(svg);wrapper.title=title??insigniaId??"Insignia";return wrapper;
}
