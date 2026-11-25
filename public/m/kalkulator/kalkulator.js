// Modul Kalkulator Marketplace: potongan TikTok/Tokopedia, Shopee, Lazada + generator judul & deskripsi.
// Logika hitung sama dengan versi aslinya; tampilan dibangun dengan DOM (tanpa innerHTML) agar lolos CSP + Trusted Types.
import { requireUser, mountUserMenu } from '../../core/auth.js';

mountUserMenu(await requireUser());

const TT_T={dcf:.07,mp:.10,mall:.122,d:[.0145,.0105,.025,.03125,.035],gxp:.035};
const TT_H={dcf:.075,mp:.10,mall:.122,d:[.014,.014,.028,.035,.04],gxp:.03};
const SP_STD={sub:"Perlengkapan Rumah > Alat Pertukangan",ns:.10,mall:.117};
const CATS=[
 ["Perkakas tangan (cetok, raskam, palu, obeng, kape)",TT_T,SP_STD,"Perkakas & Pertukangan"],
 ["Perlengkapan bangunan (sealant, lem, nat, waterproofing)",TT_H,{sub:"Alat Pertukangan & Renovasi Rumah",ns:.10,mall:.117},"Bahan & Perlengkapan Bangunan"],
 ["Peralatan listrik (bor, gerinda, mesin poles)",TT_T,{sub:"Alat Pertukangan & Renovasi Rumah",ns:.10,mall:.117},"Alat Listrik / Power Tools"],
 ["Perangkat keras (baut, paku, engsel, kunci)",TT_T,{sub:"Alat Pengaman (gembok, kunci pintu)",ns:.10,mall:.117},"Perkakas & Pertukangan"],
 ["Alat ukur tangan (meteran, waterpass, siku)",TT_T,{sub:"Alat Pertukangan & Renovasi Rumah",ns:.10,mall:.117},"Perkakas & Pertukangan"],
 ["Pompa & perpipaan (pipa, keran, fitting)",{dcf:.07,mp:.0925,mall:.1145,d:[.0085,.0105,.019,.02375,.0275],gxp:.035},{sub:"Perlengkapan Kamar Mandi",ns:.10,mall:.117},"Perlengkapan Rumah"],
 ["Keamanan & keselamatan (helm proyek, sarung tangan)",TT_H,{sub:"Alat Pengaman (gembok, kunci pintu, pemadam)",ns:.10,mall:.117},"Keamanan Rumah"],
 ["Organizer perkakas (toolbox, tas perkakas)",{dcf:.07,mp:.10,mall:.122,d:[.01416,.01291,.02706,.03383,.03844],gxp:.035},SP_STD,"Perkakas & Pertukangan"],
 ["Kawat & kabel listrik",{dcf:.075,mp:.0625,mall:.122,d:[.014,.014,.028,.035,.04],gxp:.03},{sub:"Perlengkapan Rumah Lainnya",ns:.10,mall:.117},"Lampu & Kelistrikan"],
 ["Lampu (bohlam, lampu kerja, senter)",{dcf:.075,mp:.10,mall:.092,d:[.014,.014,.028,.035,.04],gxp:.03},{sub:"Lampu",ns:.095,mall:.117},"Lampu & Kelistrikan"]
];
const LZ_MP=[.0818,.0768,.0718,.0643,.0493,.0468,.0395,.0343,.0243,.0068];
const LZ_LM=[.117,.1045,.102,.0995,.077,.072,.062,.047,.042,.032,.025];
const LZ_FSM=[.11,.105,.095,.09,.085,.065,.05,.015];
const LZ_TRX=.0182,PROC=1250,MALLPAY=0;
const SP_P=[["gox","Gratis Ongkir XTRA"],["px","Promo XTRA"],["pxp","Promo XTRA+"],["spl","SPayLater XTRA 0%"]];
const SP_Q=[["aff","Komisi affiliate (AMS)"],["live","Live XTRA"],["vid","Video XTRA"]];
const DEF={p:"tiktok",cat:"0",price:"85000",disc:"0",hpp:"55000",other:"2000",target:"20",
 tt_type:"mp",tt_g:"0",tt_o:"0",tt_s:"0",
 sp_type:"ns",sp_gox:"1",sp_gox_p:"7,5",sp_gox_m:"0",sp_px:"1",sp_px_p:"4,5",sp_px_m:"0",sp_pxp:"0",sp_pxp_p:"0",sp_pxp_m:"0",sp_spl:"0",sp_spl_p:"0",sp_spl_m:"0",
 sp_aff:"1",sp_aff_p:"0",sp_aff_m:"0",sp_live:"1",sp_live_p:"3",sp_live_m:"1000",sp_vid:"1",sp_vid_p:"3",sp_vid_m:"1000",
 lz_type:"mp",lz_tier:"0",lz_fsm:"0",lz_fsmr:"0",lz_vm:"0",lz_baru:"0",lz_pph:"0"};

const $=id=>document.getElementById(id);
const rp=n=>(n<0?"−":"")+"Rp"+Math.round(Math.abs(n)).toLocaleString("id-ID");
const pc=n=>(n*100).toLocaleString("id-ID",{maximumFractionDigits:2})+"%";
const num=v=>Math.max(0,parseFloat(String(v).replace(/\./g,"").replace(",","."))||0);
const fmt=v=>{const n=num(v);return n?n.toLocaleString("id-ID"):"0"};

// ---- Pembangun DOM kecil
function el(tag,attrs,...kids){
  const e=document.createElement(tag);
  for(const [k,v] of Object.entries(attrs||{})){
    if(v==null||v===false)continue;
    if(k==="class")e.className=v;else if(k==="text")e.textContent=v;else e.setAttribute(k,v===true?"":v);
  }
  for(const c of kids.flat())if(c!=null&&c!==false)e.append(c);
  return e;
}
const fill=(node,kids)=>node.replaceChildren(...kids);
const yn=k=>el("div",{class:"seg","data-k":k},el("button",{type:"button","data-v":"1",text:"Ya"}),el("button",{type:"button","data-v":"0",text:"Tidak"}));
const progRow=([k,n])=>el("div",{class:"prog"},el("span",{text:n}),yn("sp_"+k),
  el("div",{class:"rp pct"},el("span",{text:"%"}),el("input",{"data-k":`sp_${k}_p`,inputmode:"decimal","aria-label":`Persen ${n}`})),
  el("div",{class:"rp"},el("span",{text:"Rp"}),el("input",{"data-k":`sp_${k}_m`,"data-n":true,inputmode:"numeric","aria-label":`Maks ${n}`})));
const options=(sel,labels)=>fill(sel,labels.map((t,i)=>el("option",{value:String(i),text:t})));

fill($("spProg"),SP_P.map(progRow));
fill($("spPromo"),SP_Q.map(progRow));
options($("cat"),CATS.map(c=>c[0]));
options($("lzFsm"),LZ_FSM.map(pc));

let st={...DEF};
try{const s=JSON.parse(localStorage.getItem("kalk-mp2")||"null");if(s)st={...DEF,...s}}catch(e){}
if(["tiktok","shopee","lazada","listing"].includes(location.hash.slice(1)))st.p=location.hash.slice(1);

function common(){return {c:CATS[+st.cat]||CATS[0],base:Math.max(0,num(st.price)-num(st.disc)),disc:num(st.disc),cost:num(st.hpp)+num(st.other),target:num(st.target)/100}}
function finish(o,rows,fee,rate,fixed){const net=o.base-fee,profit=net-o.cost;return {rows,fee,net,profit,rate,fixed,base:o.base}}
// ---- TikTok & Tokopedia
function ttDisc(r,s,od,g){if(s)return g?r.d[4]:r.d[3];if(od&&g)return r.d[2];if(g)return r.d[1];if(od)return r.d[0];return 0}
function calcTT(o,ov={}){
  const x={type:st.tt_type,g:st.tt_g==="1",od:st.tt_o==="1",s:st.tt_s==="1",...ov};
  const r=o.c[1],b=o.base,mall=x.type==="mall";
  const comm=mall?r.mall:r.mp,dr=ttDisc(r,x.s,x.od,x.g);
  const commRp=b*comm,discRp=Math.min(b*dr,commRp),mallRp=mall?Math.min(b*.018,50000):0,dcfRp=Math.min(b*r.dcf,650000),gxpRp=x.g?b*r.gxp:0;
  const fee=commRp-discRp+mallRp+dcfRp+gxpRp+PROC;
  const rows=[["Harga setelah diskon toko","",b,"sub"],[`Komisi platform (${mall?"Mall":"toko biasa"})`,pc(comm),-commRp],["Diskon komisi dari program",dr?pc(dr):"–",discRp],
    ["Komisi dinamis",pc(r.dcf),-dcfRp],["Biaya layanan Mall",mall?"1,8%":"–",-mallRp],["Biaya Growth Xtra",x.g?pc(r.gxp):"–",-gxpRp],["Biaya proses pesanan","tetap",-PROC]];
  const res=finish(o,rows,fee,comm-dr+(mall?.018:0)+r.dcf+(x.g?r.gxp:0),o.cost+PROC);
  res.dr=dr;res.gxpRp=gxpRp;return res;
}
// ---- Shopee
function spAmt(o,k){if(st["sp_"+k]!=="1")return [0,0];const p=num(st["sp_"+k+"_p"])/100,m=num(st["sp_"+k+"_m"]);const a=o.base*p;return [p,m>0?Math.min(a,m):a]}
function calcSP(o){
  const s=o.c[2],mall=st.sp_type==="mall",adm=mall?s.mall:s.ns,pay=mall?MALLPAY:0,b=o.base;
  const plat=b*adm+b*pay+PROC;
  const progs=SP_P.map(([k,n])=>[n,...spAmt(o,k)]);
  const progTot=progs.reduce((a,p)=>a+p[2],0);
  const rows=[["Harga setelah diskon toko","",b,"sub"],[`Biaya admin (${s.sub})`,pc(adm),-b*adm],["Biaya pembayaran Shopee Mall",mall?pc(pay):"–",-b*pay],["Biaya proses pesanan","tetap",-PROC],
    ["Subtotal biaya platform","",-plat,"sub"],...progs.filter((p,i)=>st["sp_"+SP_P[i][0]]==="1").map(p=>[p[0],pc(p[1]),-p[2]]),["Subtotal biaya program opsional","",-progTot,"sub"]];
  const res=finish(o,rows,plat+progTot,adm+pay+progs.reduce((a,p)=>a+p[1],0),o.cost+PROC);
  res.adj=SP_Q.map(([k,n])=>[n,...spAmt(o,k)]).filter((p,i)=>st["sp_"+SP_Q[i][0]]==="1");
  return res;
}
// ---- Lazada
function calcLZ(o){
  const lm=st.lz_type==="lm",tiers=lm?LZ_LM:LZ_MP,baru=st.lz_baru==="1",b=o.base;
  const kom=baru?0:(tiers[+st.lz_tier]??tiers[0]);
  const fsm=st.lz_fsm==="1"?(LZ_FSM[+st.lz_fsmr]??LZ_FSM[0]):0,vm=st.lz_vm==="1"?.035:0,pph=st.lz_pph==="1"?.005:0,proc=baru?0:PROC;
  const fsmRp=Math.min(b*fsm,60000),vmRp=Math.min(b*vm,50000);
  const fee=b*LZ_TRX+b*kom+fsmRp+vmRp+b*pph+proc;
  const rows=[["Harga setelah diskon toko","",b,"sub"],["Biaya transaksi",pc(LZ_TRX),-b*LZ_TRX],[`Komisi kategori (${o.c[3]})`,baru?"bebas 90 hari":pc(kom),-b*kom],
    ["Free Shipping Max",fsm?pc(fsm):"–",-fsmRp],["Voucher MAX",vm?"3,5%":"–",-vmRp],["PPh 22",pph?"0,5%":"–",-b*pph],["Biaya proses pesanan",baru?"belum kena":"tetap",-proc]];
  return finish(o,rows,fee,LZ_TRX+kom+fsm+vm+pph,o.cost+proc);
}
const CALC={tiktok:calcTT,shopee:calcSP,lazada:calcLZ};
const NAME={tiktok:"TikTok & Tokopedia",shopee:"Shopee",lazada:"Lazada"};

function priceFor(x,m,disc){const d=1-x.rate-m;return d>0?x.fixed/d+disc:NaN}
const rowEls=rows=>rows.map(r=>el("tr",{class:r[3]||null},el("td",{text:r[0]}),el("td",{class:"r",text:r[1]}),el("td",{class:"r",text:rp(r[2]||0)})));
const tagEl=t=>el("span",{class:"tag",text:t});

function render(){
  if(!CALC[st.p]){renderGen();return}
  const o=common(),x=CALC[st.p](o);
  $("profit").textContent=rp(x.profit);
  $("profit").className="big "+(x.profit<0?"neg":"pos");
  $("net").textContent=rp(x.net);
  $("feeTot").textContent=rp(x.fee)+(x.base?" ("+pc(x.fee/x.base)+")":"");
  const tot=Math.max(x.base,o.cost+x.fee,1),w=v=>Math.max(0,v/tot*100)+"%";
  $("bM").style.width=w(Math.min(o.cost,x.base));
  $("bF").style.width=w(Math.min(x.fee,Math.max(0,x.base-o.cost)));
  $("bW").style.width=w(Math.max(0,x.profit));
  $("tapeNote").textContent=x.profit<0?"Rugi: modal + potongan melebihi harga jual":"";
  $("tape").setAttribute("aria-label",`Dari harga ${rp(x.base)}: modal ${rp(o.cost)}, potongan ${rp(x.fee)}, untung ${rp(x.profit)}`);
  fill($("rows"),rowEls([...x.rows,["Uang masuk ke saldo",pc(x.base?x.net/x.base:0),x.net,"tot"],["Modal + biaya lain","",-o.cost],["Untung bersih",pc(x.base?x.profit/x.base:0),x.profit,"tot"]]));
  const bep=priceFor(x,0,o.disc),sug=priceFor(x,o.target,o.disc);
  $("bep").textContent=isFinite(bep)?rp(Math.ceil(bep/100)*100):"–";
  $("sugL").textContent=`Saran harga untuk untung ${pc(o.target)}`;
  $("sug").textContent=isFinite(sug)?rp(Math.ceil(sug/500)*500):"terlalu tinggi";
  $("mg").textContent=x.base?pc(x.profit/x.base):"–";
  // penyesuaian Shopee
  $("spAdj").hidden=st.p!=="shopee";
  if(st.p==="shopee"){
    const a=x.adj.reduce((s,p)=>s+p[2],0),n2=x.net-a,p2=n2-o.cost;
    fill($("adjRows"),rowEls([["Estimasi hasil penjualan","",x.net,"sub"],...x.adj.map(p=>[p[0],pc(p[1]),-p[2]]),["Penyesuaian hasil penjualan",pc(x.base?n2/x.base:0),n2,"tot"],["Penyesuaian keuntungan bersih",pc(x.base?p2/x.base:0),p2,"tot"]]));
  }
  // skenario TikTok
  $("ttScen").hidden=st.p!=="tiktok";
  if(st.p==="tiktok"){
    const S=[["Tanpa program",0,0,0],["Pesanan dari GMV Max",0,1,0],["Growth Xtra saja",0,0,1],["Growth Xtra + pesanan GMV Max",0,1,1],["GMV Max ≥3%",1,0,0],["GMV Max ≥3% + Growth Xtra",1,0,1]];
    const cs=st.tt_s==="1",co=st.tt_o==="1",cg=st.tt_g==="1";
    const res=S.map(s=>({n:s[0],cur:cs===!!s[1]&&(s[1]||co===!!s[2])&&cg===!!s[3],y:calcTT(o,{s:!!s[1],od:!!s[2],g:!!s[3]})}));
    const best=Math.min(...res.map(r=>r.y.fee));
    fill($("scen"),res.map(r=>el("tr",{class:r.y.fee===best?"best":null},
      el("td",{},r.n,r.cur?tagEl("pilihanmu"):null),
      el("td",{class:"r",text:r.y.dr?"−"+pc(r.y.dr):"–"}),
      el("td",{class:"r",text:r.y.gxpRp?rp(r.y.gxpRp):"–"}),
      el("td",{class:"r",text:rp(r.y.fee)}),
      el("td",{class:"r"+(r.y.profit<0?" neg":""),text:rp(r.y.profit)}))));
  }
  // bandingkan platform
  const all=Object.keys(CALC).map(k=>({k,y:CALC[k](o)}));
  const bestP=Math.max(...all.map(a=>a.y.profit));
  fill($("cmp"),all.map(a=>el("tr",{class:a.y.profit===bestP?"best":null},
    el("td",{},NAME[a.k],a.k===st.p?tagEl("dilihat"):null),
    el("td",{class:"r",text:rp(a.y.fee)}),
    el("td",{class:"r",text:a.y.base?pc(a.y.fee/a.y.base):"–"}),
    el("td",{class:"r",text:rp(a.y.net)}),
    el("td",{class:"r"+(a.y.profit<0?" neg":""),text:rp(a.y.profit)}))));
  try{localStorage.setItem("kalk-mp2",JSON.stringify(st))}catch(e){}
}
function sync(){
  const L=st.p==="listing";$("calcMain").hidden=L;$("calcMore").hidden=L;$("genMain").hidden=!L;
  for(const b of document.querySelectorAll(".tabs button"))b.setAttribute("aria-selected",b.dataset.p===st.p);
  for(const d of document.querySelectorAll("[data-for]"))d.hidden=d.dataset.for!==st.p;
  const tiers=st.lz_type==="lm"?LZ_LM:LZ_MP;
  if(+st.lz_tier>=tiers.length)st.lz_tier="0";
  options($("lzTier"),tiers.map((v,i)=>`${pc(v)} + transaksi 1,82% = ${pc(v+LZ_TRX)}${i===0?" (tertinggi)":""}`));
  $("fsmRow").hidden=st.lz_fsm!=="1";
  for(const e of document.querySelectorAll("input[data-k],select[data-k]"))e.value=e.hasAttribute("data-n")?fmt(st[e.dataset.k]):st[e.dataset.k];
  for(const g of document.querySelectorAll(".seg[data-k]"))for(const b of g.querySelectorAll("button"))b.setAttribute("aria-pressed",b.dataset.v===st[g.dataset.k]);
  render();
}
document.querySelector(".tabs").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;st.p=b.dataset.p;try{history.replaceState(null,"","#"+st.p)}catch(_){location.hash=st.p}sync()});
$("f").addEventListener("input",e=>{const k=e.target.dataset.k;if(!k)return;st[k]=e.target.value;if(e.target.tagName==="SELECT")sync();else render()});
$("f").addEventListener("change",e=>{const k=e.target.dataset.k;if(k&&e.target.tagName==="SELECT"){st[k]=e.target.value;sync()}});
$("f").addEventListener("focusout",e=>{if(e.target.hasAttribute&&e.target.hasAttribute("data-n")){e.target.value=fmt(e.target.value);st[e.target.dataset.k]=e.target.value}});
$("f").addEventListener("click",e=>{const b=e.target.closest(".seg[data-k] button");if(!b)return;st[b.parentElement.dataset.k]=b.dataset.v;sync()});
$("f").addEventListener("submit",e=>e.preventDefault());
$("reset").addEventListener("click",()=>{const p=st.p;st={...DEF,p};sync()});
window.addEventListener("hashchange",()=>{const h=location.hash.slice(1);if((CALC[h]||h==="listing")&&h!==st.p){st.p=h;sync()}});

// ---- Judul & deskripsi (template, tanpa AI)
const GK=["nama","jenis","model","material","ukuran","isi","guna"];
const GLBL={nama:"Nama Produk",jenis:"Jenis Produk",model:"Model/Tipe",material:"Material",ukuran:"Ukuran",isi:"Isi Paket"};
const UNITS=new Set(["ml","l","lt","liter","mm","cm","m","meter","kg","gr","g","gram","inch","in","pcs","pc","set","x","w","watt","v","volt","mtr","roll","dus","box","btg","batang","lbr","lembar"]);
const GEX={nama:"Cetok tembok",jenis:"Sendok semen",model:"Ujung lancip",material:"Baja, gagang kayu",ukuran:"7 inch",isi:"1 pcs cetok",guna:""};
const CLAIMS=["anti karat","antikarat","tahan air","waterproof","heavy duty","premium","food grade","tahan panas","kuat","awet","original","ori","terbaik","termurah","nomor satu","no 1","no. 1","paling","sni","iso","berkualitas","kualitas terbaik","dijamin","garansi","100%"];
let gs={...GEX};
try{const s=JSON.parse(localStorage.getItem("kalk-listing")||"null");if(s)gs={...GEX,...s}}catch(e){}
const clean=v=>String(v||"").replace(/\s+/g," ").trim();
const cap=w=>UNITS.has(w.toLowerCase())||/[0-9]/.test(w)||w.length<2||w===w.toUpperCase()&&/[A-Z]/.test(w)?w:w[0].toUpperCase()+w.slice(1);
const titleCase=t=>t.split(" ").map(w=>w.split("/").map(cap).join("/")).join(" ");
const lc=t=>t.charAt(0).toLowerCase()+t.slice(1);
function titleParts(g){
  const seen=new Set(),out=[];
  const n=(g.isi||"").match(/\d+/);const isiOk=g.isi&&g.isi.length<=25&&((n&&+n[0]>1)||/\b(set|isi|paket|pasang|lusin|kodi)\b/i.test(g.isi));
  for(const k of ["nama","jenis","model","material","ukuran",isiOk?"isi":null]){
    if(!k||!g[k])continue;
    const words=g[k].replace(/,/g," ").split(" ").filter(Boolean);
    const keep=words.filter(w=>{const l=w.toLowerCase();if(seen.has(l)&&!/\d/.test(l))return false;return true});
    keep.forEach(w=>seen.add(w.toLowerCase()));
    if(keep.length)out.push(titleCase(keep.join(" ")));
  }
  return out;
}
function makeListing(g){
  const p=titleParts(g),title=p.join(" ");
  let sp=[...p];while(sp.length>1&&sp.join(" ").length>70)sp.pop();
  let short=sp.join(" ");if(short.length>70)short=short.slice(0,70).replace(/\s+\S*$/,"");
  const L=[];
  let r=g.nama||g.jenis?`${g.nama||g.jenis}`:"";
  if(r){
    const bits=[];
    if(g.jenis&&g.nama)bits.push(`merupakan ${lc(g.jenis)}`);
    if(g.model)bits.push(`dengan model ${lc(g.model)}`);
    if(g.ukuran)bits.push(`berukuran ${g.ukuran}`);
    r=(bits.length?`${r} ${bits.join(" ")}`:`${r}`)+".";
    L.push("Ringkasan Produk",r,"");
  }
  const spec=["nama","jenis","model","material","ukuran","isi"].filter(k=>g[k]).map(k=>`- ${GLBL[k]}: ${g[k]}`);
  if(spec.length)L.push("Spesifikasi Produk",...spec,"");
  const inf=[];
  if(g.material)inf.push(`Produk ini menggunakan material ${lc(g.material)}.`);
  if(g.ukuran)inf.push(`Ukuran produk ${g.ukuran}.`);
  if(g.guna)inf.push(`Produk ini digunakan untuk ${lc(g.guna).replace(/\.$/,"")}.`);
  if(inf.length)L.push("Informasi Produk",inf.join(" "),"");
  if(g.isi)L.push("Isi Paket",`Dalam satu paket, pembeli menerima ${lc(g.isi).replace(/\.$/,"")}.`,"");
  L.push("Catatan Pembelian","- Periksa kembali ukuran dan tipe sebelum membeli.","- Pastikan produk sesuai dengan kebutuhan pemasangan atau penggunaan.","- Hubungi penjual jika membutuhkan konfirmasi spesifikasi.");
  const kl=[g.nama,g.jenis,[g.nama,g.ukuran],[g.jenis,g.material],[g.jenis,g.model],[g.nama,g.model],[g.jenis,g.ukuran],[g.nama,g.material],[g.nama,g.jenis],g.model]
    .map(x=>Array.isArray(x)?(x.every(Boolean)?x.join(" "):""):(x||"")).map(x=>clean(x.replace(/,/g," ")).toLowerCase()).filter(x=>x&&x.length>2);
  const kw=[...new Set(kl)].slice(0,10);
  return {title,short,desc:L.join("\n").trim(),kw};
}
function renderGen(){
  const g={};for(const k of GK)g[k]=clean(gs[k]);
  const has=["nama","jenis","model","material","ukuran","isi"].some(k=>g[k]);
  if(!has){$("gTitle").textContent="Isi minimal nama produk";$("gDesc").textContent="–";fill($("gKwChips"),[]);$("gKw").textContent="";$("gCount").textContent="";$("gShortWrap").hidden=true;fill($("gWarn"),[]);$("gMissing").textContent="";return}
  const x=makeListing(g);
  $("gTitle").textContent=x.title;
  fill($("gCount"),[`${x.title.length} karakter`,x.title.length>70?" · ":null,x.title.length>70?el("span",{class:"over",text:"lebih dari 70"}):null].filter(Boolean));
  $("gShortWrap").hidden=x.title.length<=70;$("gShort").textContent=x.short;
  $("gDesc").textContent=x.desc;
  $("gKw").textContent=x.kw.join(", ");
  fill($("gKwChips"),x.kw.map(k=>el("span",{text:k})));
  const all=GK.map(k=>g[k].toLowerCase()).join(" | ");
  const hit=CLAIMS.filter(c=>new RegExp("(^|[^a-z])"+c.replace(/[.%]/g,"\\$&")+"([^a-z]|$)").test(all));
  fill($("gWarn"),hit.length?[el("p",{class:"warn"},"Ada kata yang berupa klaim: ",el("b",{text:hit.join(", ")}),". Pakai hanya jika ada buktinya (sertifikat, hasil uji, atau keterangan pabrik).")]:[]);
  const miss=["nama","jenis","model","material","ukuran","isi"].filter(k=>!g[k]).map(k=>GLBL[k].toLowerCase());
  $("gMissing").textContent=miss.length?`Belum diisi, jadi tidak ditulis: ${miss.join(", ")}.`:"";
  try{localStorage.setItem("kalk-listing",JSON.stringify(gs))}catch(e){}
}
function syncGen(){for(const e of document.querySelectorAll("[data-g]"))e.value=gs[e.dataset.g]||"";renderGen()}
$("g").addEventListener("input",e=>{const k=e.target.dataset.g;if(k){gs[k]=e.target.value;renderGen()}});
$("g").addEventListener("submit",e=>e.preventDefault());
$("gEx").addEventListener("click",()=>{gs={...GEX};syncGen()});
$("gClear").addEventListener("click",()=>{gs={};for(const k of GK)gs[k]="";syncGen()});
for(const b of document.querySelectorAll(".copy"))b.addEventListener("click",async()=>{
  const t=$(b.dataset.c).textContent;
  try{await navigator.clipboard.writeText(t);b.textContent="Tersalin";b.classList.add("done")}
  catch(e){const r=document.createRange();r.selectNodeContents($(b.dataset.c));const s=getSelection();s.removeAllRanges();s.addRange(r);b.textContent="Tekan Ctrl+C"}
  setTimeout(()=>{b.textContent="Salin";b.classList.remove("done")},1800);
});
syncGen();
sync();
