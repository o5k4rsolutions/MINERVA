/* ===== Dodatek do Dziennika Minerva ===== */
const _st=document.createElement('style');_st.textContent='.ac.released{background:#ede9fe;color:#5b21b6}';document.head.appendChild(_st);

/* 1. Frekwencja: zwolnienie */
AS.released='zwolniony';AC.released=['Z','nu'];SYM.released='z';STC.push('released');

/* 2. Data: wpisywanie dd.mm.rrrr (kalendarz nadal dostępny) */
const dpIn=id=>{const f=FV[id];return `<div class="flex gap-1"><input type="text" class="inp" inputmode="numeric" placeholder="dd.mm.rrrr" maxlength="10" value="${f?f.slice(8)+'.'+f.slice(5,7)+'.'+f.slice(0,4):''}" oninput="dpType('${id}',this)"><button type="button" class="gh ddb" style="width:auto" onclick="dpOpen('${id}',this.parentNode)">${ic('cal')}</button></div>`};
function dp(id,val,x={}){DD[id]={x};FV[id]=val||'';return `<div class="dd" id="dd_${id}">${dpIn(id)}</div>`}
function dpType(id,i){let s=i.value.replace(/\D/g,'').slice(0,8),o=s.slice(0,2);if(s.length>2)o+='.'+s.slice(2,4);if(s.length>4)o+='.'+s.slice(4);i.value=o;
  let iso='';if(s.length===8){const d=+s.slice(0,2),m=+s.slice(2,4),y=+s.slice(4),t=new Date(y,m-1,d,12);if(y>1990&&t.getMonth()===m-1&&t.getDate()===d)iso=isoL(t)}
  const ch=FV[id]!==iso;FV[id]=iso;dirty=true;i.style.borderColor=s.length===8&&!iso?'#dc2626':'';if(ch&&iso)DD[id].x.on&&DD[id].x.on(iso)}
function dpPick(id,s){FV[id]=s;closePop();$('#dd_'+id).innerHTML=dpIn(id);dirty=true;DD[id].x.on&&DD[id].x.on(s)}

/* 3. Wiadomości: klasa ucznia / dziecko rodzica przy nazwisku */
const lbl=()=>{const o=[];Object.values(P).forEach(p=>{let s='';
  if(p.role==='student')s=' (kl. '+cn(ST[p.id]?.class_id)+')';
  else if(p.role==='parent'){const k=PC.filter(r=>r.parent_id===p.id).map(r=>nm(r.student_id)+', kl. '+cn(ST[r.student_id]?.class_id));s=k.length?' (rodzic: '+k.join('; ')+')':''}
  if(s){o.push([p,p.last_name]);p.last_name+=s}});return()=>o.forEach(([p,l])=>p.last_name=l)};
const _vm=V.msg;V.msg=async()=>{const u=lbl();try{return await _vm()}finally{u()}};
const _om=openMsg;openMsg=async function(id,s){const u=lbl();try{return await _om(id,s)}finally{u()}};

/* 4. Dowolne wydarzenia w planie: nazwa = wpisany opis */
EVN.other=['Wydarzenie','b'];
const evFix=()=>$$('#main .evp').forEach(b=>{const m=(b.getAttribute('onclick')||'').match(/evShow\('([^']+)'/),x=m&&EVM[m[1]];if(x&&x.kind==='other'&&x.title)b.textContent=x.title});
new MutationObserver(evFix).observe($('#main'),{childList:true,subtree:true});
/* przycisk "zwolniony" w pędzlu frekwencji */
new MutationObserver(()=>{const g=$('#sg_brush');if(g&&!g.querySelector('[data-k=released]'))g.insertAdjacentHTML('beforeend',`<button type="button" data-k="released" class="${FV.brush==='released'?'on':''}" onclick="sgP('brush','released')">z zwolniony</button>`)}).observe($('#main'),{childList:true,subtree:true});

/* 5. Zmiany w planie: lista nauczycieli z informacją kto wolny */
const tchAt=async(d,n)=>{const [t,a]=await Promise.all([sb.from('timetable').select('*'),sb.from('teacher_absences').select('*').eq('date',d)]);
  const busy=new Set(entries(t.data||[],mon(new Date(d+'T12:00')),r=>r.d===d&&r.n===n&&r.st!=='cancel'&&r.st!=='moved').map(r=>r.st==='sub'?r.sub:T.find(y=>y.id===r.teaching_id)?.teacher_id)),
   abs=new Set((a.data||[]).filter(x=>x.lesson_from<=n&&x.lesson_to>=n).map(x=>x.teacher_id));return{busy,abs}};
const _cp=chPick;chPick=function(cid,d,n,tid){_cp(cid,d,n,tid);tchAt(d,n).then(({busy,abs})=>{if(!DD.ct2)return;
  const r=id=>abs.has(id)?2:busy.has(id)?1:0;
  DD.ct2.o=DD.ct2.o.map(([id,l])=>[id,l,abs.has(id)?'nieobecny':busy.has(id)?'ma lekcję':'wolny']).sort((a,b)=>r(a[0])-r(b[0]));$('#dd_ct2').innerHTML=ddb('ct2')})};

/* 6. Nieobecność nauczyciela / wycieczka -> automatyczne propozycje zastępstw */
const _ad=V.ad;V.ad=async()=>{let h=await _ad();if(!adTab)h=h.replace(/<\/div>$/,`<button class="tile" onclick="adTab='abs';rr()">${ic('user')}<b>Nieobecności nauczycieli</b><span>Choroba, wycieczka - system proponuje zastępstwa</span></button></div>`);return h};
let ABP=[];
AD.abs=async back=>{
  const tch=Object.values(P).filter(p=>['teacher','director'].includes(p.role)).sort((a,b)=>ln(a.id).localeCompare(ln(b.id),'pl')),L=[1,2,3,4,5,6,7,8,9,10].map(n=>[n,'Lekcja '+n]);
  const {data}=await sb.from('teacher_absences').select('*').gte('date',isoL(addD(new Date(),-7))).order('date');
  return pn('Nowa nieobecność nauczyciela',`<div class="grid md:grid-cols-3 gap-3"><div><label class="lb">Nauczyciel</label>${dd('abt',tch.map(p=>[p.id,ln(p.id)]),'',{ph:'Wybierz…'})}</div><div><label class="lb">Dzień</label>${dp('abd',isoL(new Date()))}</div><div><label class="lb">Powód</label>${dd('abr',[['Choroba','Choroba'],['Wycieczka','Wycieczka (opiekun)'],['Delegacja / szkolenie','Delegacja / szkolenie'],['Inne','Inne']],'Choroba')}</div>
   <div><label class="lb">Od lekcji (cały dzień: 1-10)</label>${dd('ab1',L,1)}</div><div><label class="lb">Do lekcji</label>${dd('ab2',L,10)}</div></div>
   <button class="btn mt-3" onclick="absRun()">Pokaż propozycje zastępstw</button><div id="abx" class="mt-3"></div>`,back,'user')
  +pn('Zgłoszone nieobecności (od tygodnia wstecz)',(data||[]).length?tbl(['Data','Nauczyciel','Lekcje','Powód',''],data.map(x=>`<tr><td>${fdl(x.date)}</td><td>${esc(nm(x.teacher_id))}</td><td>${x.lesson_from}-${x.lesson_to}</td><td>${esc(x.reason||'')}</td><td><button class="gh sm red" onclick="absDel('${x.id}')">${ic('trash')}</button></td></tr>`)):'<p class="em">Brak.</p>','','user')};
async function absRun(){
  const t=FV.abt,d=FV.abd,a=+FV.ab1,b=+FV.ab2;if(!t||!d)return warn('Wybierz nauczyciela i dzień.');if(b<a)return warn('Zakres lekcji jest błędny.');
  const dt=new Date(d+'T12:00');if(dt.getDay()%6===0||hol(dt))return warn('To dzień wolny od zajęć.');
  const [tt,ab]=await Promise.all([sb.from('timetable').select('*'),sb.from('teacher_absences').select('*').eq('date',d)]);
  const mt=T.filter(x=>x.teacher_id===t).map(x=>x.id),all=entries(tt.data||[],mon(dt),r=>r.d===d),
   mine=all.filter(r=>!r.st&&mt.includes(r.teaching_id)&&r.n>=a&&r.n<=b).sort((x,y)=>x.n-y.n),tchs=Object.values(P).filter(p=>['teacher','director'].includes(p.role)),taken=new Set();
  if(!mine.length){$('#abx').innerHTML='<p class="em">Ten nauczyciel nie ma w tym czasie lekcji.</p>';return}
  ABP=mine.map(r=>{
    const live=all.filter(x=>x.n===r.n&&x.st!=='cancel'&&x.st!=='moved'),busy=new Set(live.map(x=>x.st==='sub'?x.sub:T.find(y=>y.id===x.teaching_id)?.teacher_id)),
     away=new Set([t,...(ab.data||[]).filter(x=>x.lesson_from<=r.n&&x.lesson_to>=r.n).map(x=>x.teacher_id)]),
     free=tchs.filter(p=>!busy.has(p.id)&&!away.has(p.id)&&!taken.has(p.id+'|'+r.n)),
     cl=all.filter(x=>x.class_id===r.class_id&&x.st!=='cancel'&&x.st!=='moved').map(x=>x.n),edge=r.n===Math.min(...cl)||r.n===Math.max(...cl),
     subj=T.find(y=>y.id===r.teaching_id)?.subject_id,same=free.filter(p=>T.some(y=>y.teacher_id===p.id&&y.subject_id===subj)),pk=edge?null:(same[0]||free[0]);
    if(pk)taken.add(pk.id+'|'+r.n);return{r,free,same,edge,def:pk?'sub:'+pk.id:'cancel'}});
  $('#abx').innerHTML=`<p class="text-sm mu mb-2">Pierwsza/ostatnia lekcja klasy: domyślnie odwołanie. W pozostałych: zastępstwo (najpierw nauczyciel tego samego przedmiotu). Możesz zmienić każdą propozycję.</p>`
   +tbl(['Lekcja','Klasa','Przedmiot','Propozycja'],ABP.map((p,i)=>`<tr><td>${p.r.n} <span class="text-xs mu">${(BELLS[p.r.n-1]||[]).join('-')}</span></td><td>${esc(cn(p.r.class_id))}${p.edge?' <span class="tag y">skraj dnia</span>':''}</td><td>${esc(sn(T.find(y=>y.id===p.r.teaching_id)?.subject_id))}</td><td style="min-width:260px">${dd('abp'+i,[['','Bez zmian'],['cancel','Odwołaj lekcję'],...p.free.map(f=>['sub:'+f.id,nm(f.id),p.same.includes(f)?'ten przedmiot':'wolny'])],p.def,{sm:1})}</td></tr>`))
   +`<button class="btn mt-3" onclick="absSave()">Zapisz nieobecność i zmiany w planie</button>`}
async function absSave(){
  const t=FV.abt,d=FV.abd,why=FV.abr,note='Nieobecność: '+nm(t)+(why?' ('+why+')':'');
  const r0=await sb.from('teacher_absences').insert({school_id:me.school_id,teacher_id:t,date:d,lesson_from:+FV.ab1,lesson_to:+FV.ab2,reason:why,created_by:me.id});if(r0.error)return warn(r0.error.message);
  const rows=ABP.map((p,i)=>{const c=FV['abp'+i];if(!c)return null;const b={school_id:me.school_id,class_id:p.r.class_id,date:d,lesson_no:p.r.n,teaching_id:p.r.teaching_id,note};
    return c==='cancel'?{...b,kind:'cancelled'}:{...b,kind:'substitution',sub_teacher_id:c.slice(4)}}).filter(Boolean);
  if(!rows.length){toast('Zapisano nieobecność');return reload()}
  act(sb.from('timetable_changes').insert(rows),reload,'Zapisano nieobecność i '+rows.length+' zmian w planie')}
const absDel=async id=>await ask('Usunąć zgłoszenie nieobecności? (zmiany w planie usuń osobno w „Zmiany w planie”)','Usuń')&&act(sb.from('teacher_absences').delete().eq('id',id),reload,'Usunięto');

/* 7. Boty rodziców (AI przez funkcję Supabase "parent-bot") */
const _ep=editPerson;editPerson=function(id){_ep(id);if(P[id]?.role!=='parent')return;
  sb.from('parent_bots').select('*').eq('parent_id',id).maybeSingle().then(({data:b})=>{const bx=$('#modal .box');if(!bx)return;const s=document.createElement('div');s.className='sec';
    s.innerHTML=`<b>Bot AI (symulowany rodzic)</b>${ck('bot_on',b?.enabled,'Bot włączony - reaguje na oceny')}<label class="lb mt-2">Charakter (opcjonalnie)</label><input type="text" id="bot_p" value="${esc(b?.persona||'')}" placeholder="np. nerwowy, dociekliwy, uprzejmy"><div class="flex flex-wrap gap-2 mt-3"><button class="btn sm" onclick="botSave('${id}')">Zapisz bota</button>${[['grade','Pytanie o ocenę'],['excuse','Usprawiedliwienie'],['retake','Prośba o poprawę'],['complaint','Skarga do wychowawcy']].map(([k,l])=>`<button class="gh sm" onclick="botRun('${id}','${k}',this)">${l}</button>`).join('')}</div>`;
    bx.insertBefore(s,bx.lastElementChild)})};
const botSave=id=>act(sb.from('parent_bots').upsert({parent_id:id,enabled:!!FV.bot_on,persona:v('bot_p').trim()||null}),null,'Zapisano bota');
async function botRun(id,scenario,b){b.classList.add('busy');const {data,error}=await sb.functions.invoke('parent-bot',{body:{action:'run',parent_id:id,scenario}});b.classList.remove('busy');
  if(error||data?.error)return warn(data?.error||error.message);toast('Bot: '+(data.info||'wykonano'))}
/* bot sam reaguje na oceny wystawione przez zalogowanego nauczyciela */
const _lg=LIVE.grades;LIVE.grades=p=>{_lg(p);if(p.eventType==='INSERT'&&staff()&&p.new.author_id===me.id)sb.functions.invoke('parent-bot',{body:{action:'grade',grade_id:p.new.id}}).catch(()=>{})};
