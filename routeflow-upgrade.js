/* RouteFlow London — live data, personal tools and accessibility.
   No demo records are generated. TfL data is requested live; personal lists stay in this browser. */
(() => {
  'use strict';
  const API='https://api.tfl.gov.uk';
  const $=(s,root=document)=>root.querySelector(s);
  const store={
    read(key,fallback){try{const value=JSON.parse(localStorage.getItem(key));return value??fallback}catch{return fallback}},
    write(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}}
  };
  const state={
    favourites:store.read('routeflow_favourite_stops',[]),
    vehicles:store.read('routeflow_tracked_vehicles',[]),
    prefs:store.read('routeflow_accessibility',{contrast:false,motion:false,text:'normal'}),
    lastUpdated:null
  };
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function get(path,signal){
    const response=await fetch(API+path,{headers:{Accept:'application/json'},signal});
    if(!response.ok)throw new Error('TfL returned '+response.status);
    return response.json();
  }
  function announce(message){const node=$('#rfAnnounce');if(node)node.textContent=message}
  function setNote(container,message,error=false){
    if(!container)return;
    let note=$('.rf-status-note',container);
    if(!note){note=document.createElement('p');note.className='rf-status-note';container.prepend(note)}
    note.textContent=message;note.dataset.state=error?'error':'ok';
  }
  function save(key,value){if(!store.write(key,value))announce('Your browser could not save this change. Check storage or privacy settings.')}
  function persist(){save('routeflow_favourite_stops',state.favourites);save('routeflow_tracked_vehicles',state.vehicles)}
  function applyPrefs(){
    const root=document.documentElement;
    root.classList.toggle('rf-high-contrast',!!state.prefs.contrast);
    root.classList.toggle('rf-reduce-motion',!!state.prefs.motion);
    root.classList.toggle('rf-large-text',state.prefs.text==='large');
    root.classList.toggle('rf-extra-large-text',state.prefs.text==='larger');
  }
  function installAccessibility(){
    const main=$('main');
    if(main){main.id='main-content';main.setAttribute('tabindex','-1')}
    const skip=document.createElement('a');skip.className='skip-link';skip.href='#main-content';skip.textContent='Skip to main content';document.body.prepend(skip);
    const header=$('.header-actions');
    if(header){
      const button=document.createElement('button');button.type='button';button.className='rf-access-button';button.id='rfAccessToggle';button.textContent='Accessibility';button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','rfAccessPanel');header.prepend(button);
      const panel=document.createElement('section');panel.className='rf-access-panel';panel.id='rfAccessPanel';panel.hidden=true;panel.setAttribute('aria-labelledby','rfAccessTitle');
      panel.innerHTML='<h2 id="rfAccessTitle">Accessibility settings</h2><p>These preferences apply on this device and are saved for your next visit.</p><label for="rfTextSize">Text size<select id="rfTextSize"><option value="normal">Standard</option><option value="large">Large</option><option value="larger">Extra large</option></select></label><label for="rfContrast">Increase contrast<input id="rfContrast" type="checkbox"></label><label for="rfMotion">Reduce motion<input id="rfMotion" type="checkbox"></label><div class="rf-panel-actions"><button type="button" id="rfResetPrefs">Reset preferences</button><button type="button" id="rfClosePrefs">Close</button></div>';
      document.body.append(panel);
      button.addEventListener('click',()=>{panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)$('#rfTextSize').focus()});
      $('#rfClosePrefs').addEventListener('click',()=>{panel.hidden=true;button.setAttribute('aria-expanded','false');button.focus()});
      $('#rfResetPrefs').addEventListener('click',()=>{state.prefs={contrast:false,motion:false,text:'normal'};save('routeflow_accessibility',state.prefs);syncPrefs();announce('Accessibility preferences reset')});
      $('#rfTextSize').addEventListener('change',e=>{state.prefs.text=e.target.value;save('routeflow_accessibility',state.prefs);applyPrefs()});
      $('#rfContrast').addEventListener('change',e=>{state.prefs.contrast=e.target.checked;save('routeflow_accessibility',state.prefs);applyPrefs()});
      $('#rfMotion').addEventListener('change',e=>{state.prefs.motion=e.target.checked;save('routeflow_accessibility',state.prefs);applyPrefs()});
      function syncPrefs(){$('#rfTextSize').value=state.prefs.text;$('#rfContrast').checked=!!state.prefs.contrast;$('#rfMotion').checked=!!state.prefs.motion;applyPrefs()}
      syncPrefs();
      document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){panel.hidden=true;button.setAttribute('aria-expanded','false');button.focus()}});
    }
    const live=document.createElement('div');live.id='rfAnnounce';live.className='rf-announce';live.setAttribute('role','status');live.setAttribute('aria-live','polite');live.setAttribute('aria-atomic','true');document.body.append(live);
    document.querySelectorAll('input:not([aria-label]):not([id])').forEach(input=>{if(input.placeholder)input.setAttribute('aria-label',input.placeholder)});
    document.querySelectorAll('button').forEach(button=>{if(!button.getAttribute('aria-label')&&!button.textContent.trim()&&!button.querySelector('img[alt]'))button.setAttribute('aria-label','Open section')});
    document.querySelectorAll('nav').forEach((nav,i)=>{if(!nav.getAttribute('aria-label'))nav.setAttribute('aria-label',i?'Page navigation':'Site navigation')});
  }
  async function loadStatus(){
    const target=$('#statusGrid');if(!target)return;
    const modes=[['Buses','bus','B'],['Tube','tube','T'],['Overground','overground','O'],['Elizabeth line','elizabeth-line','E']];
    const results=await Promise.all(modes.map(async ([label,mode,mark])=>{try{const lines=await get('/Line/Mode/'+mode+'/Status');const issues=lines.flatMap(line=>(line.lineStatuses||[]).filter(s=>(s.statusSeverity??10)!==10).map(s=>({line:line.name,description:s.statusSeverityDescription||'Disruption'})));return {label,mark,lines,issues,ok:true}}catch{return {label,mark,lines:[],issues:[],ok:false}}}));
    target.innerHTML='';
    results.forEach(result=>{
      const row=document.createElement('div');row.className='mode-status';
      const symbol=document.createElement('span');symbol.className='mode-symbol';symbol.textContent=result.mark;
      const copy=document.createElement('div');const name=document.createElement('strong');name.textContent=result.label;const detail=document.createElement('small');
      const count=result.issues.length;detail.textContent=!result.ok?'Live status unavailable':count?count+' reported issue'+(count===1?'':'s'):'Good service';
      const indicator=document.createElement('i');indicator.className=!result.ok?'warn':count?'warn':'ok';
      copy.append(name,detail);row.append(symbol,copy,indicator);target.append(row);
    });
    const bus=results[0],summary=!bus.ok?'Bus status unavailable':bus.issues.length?bus.issues.length+' bus route advisories reported':'No bus route advisories reported';
    const heading=$('.service-summary strong');if(heading)heading.textContent=summary;
    const busText=$('[data-status="buses"]');if(busText)busText.textContent=summary;
    const disruptions=$('#disruptions .cards');
    if(disruptions){
      disruptions.innerHTML='';
      const issues=results.flatMap(r=>r.issues.map(i=>({mode:r.label,...i})));
      if(!issues.length){const card=document.createElement('article');card.className='update-card';card.innerHTML='<h2>No current issues reported</h2><p>Live TfL mode status returned no route-level service issues for the modes checked.</p>';disruptions.append(card)}
      issues.slice(0,60).forEach(issue=>{const card=document.createElement('article');card.className='update-card';const small=document.createElement('small');small.textContent=issue.mode.toUpperCase()+' · ROUTE '+issue.line;const h=document.createElement('h2');h.textContent=issue.description;const p=document.createElement('p');p.textContent='Live status supplied by TfL. Check again before travelling.';card.append(small,h,p);disruptions.append(card)});
      if(results.some(r=>!r.ok)){const note=document.createElement('p');note.className='rf-status-note';note.textContent='Some mode status feeds could not be reached. Unavailable feeds are not treated as good service.';disruptions.prepend(note)}
    }
    setNote(target,'Live TfL service status · refreshed '+new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}));
    state.lastUpdated=new Date();
  }
  async function loadHomeStop(){
    const box=$('#nearArrivals');if(!box)return;
    box.innerHTML='<p class="rf-empty">Finding live arrivals for Rye Hill Park…</p>';
    try{
      const search=await get('/StopPoint/Search/'+encodeURIComponent('Rye Hill Park')+'?modes=bus');
      const stop=search.matches?.find(x=>/Rye Hill Park/i.test(x.name))||search.matches?.[0];
      if(!stop)throw new Error('Stop not found');
      const rows=await get('/StopPoint/'+encodeURIComponent(stop.id)+'/Arrivals');
      rows.sort((a,b)=>a.timeToStation-b.timeToStation);
      box.replaceChildren();
      if(!rows.length){box.innerHTML='<p class="rf-empty">TfL returned no upcoming arrivals for this stop.</p>';return}
      rows.slice(0,5).forEach(a=>box.append(makeArrival(a)));
      const title=$('.stop-heading strong');if(title)title.textContent=stop.name;
      const sub=$('.stop-heading small');if(sub)sub.textContent='Live TfL stop · '+(stop.indicator?'Stop '+stop.indicator:stop.id);
      const fav=document.createElement('button');fav.type='button';fav.className='rf-fav-action';fav.textContent=state.favourites.some(s=>s.id===stop.id)?'Remove favourite':'Save this stop';fav.setAttribute('aria-pressed',String(state.favourites.some(s=>s.id===stop.id)));fav.addEventListener('click',()=>toggleFavourite({id:stop.id,name:stop.name,indicator:stop.indicator||''}));box.append(fav);
      const note=document.createElement('p');note.className='rf-data-footnote';note.textContent='Live TfL predictions. Arrival times can change.';box.append(note);
    }catch{box.innerHTML='<p class="rf-empty">Live arrivals could not be loaded. Check your connection and try again.</p>'}
  }
  function makeArrival(a){
    const row=document.createElement('div');row.className='rf-live-row';
    const route=document.createElement('span');route.className='rf-route-badge';route.textContent=a.lineName||'—';
    const detail=document.createElement('span');const strong=document.createElement('strong');strong.textContent=a.destinationName||'Destination not supplied';const small=document.createElement('small');small.textContent=a.vehicleId?'Vehicle '+a.vehicleId:'Vehicle not supplied';detail.append(strong,small);
    const time=document.createElement('time');time.className='rf-live-time';time.textContent=a.timeToStation<60?'Due':Math.max(1,Math.round(a.timeToStation/60))+' min';row.append(route,detail,time);return row;
  }
  function toggleFavourite(stop){
    const exists=state.favourites.some(s=>s.id===stop.id);
    state.favourites=exists?state.favourites.filter(s=>s.id!==stop.id):[...state.favourites,stop].slice(0,50);persist();renderFavourites();renderDashboard();announce(exists?'Stop removed from favourites':stop.name+' saved to favourites');loadHomeStop();
  }
  function renderFavourites(){
    const box=$('.favourites-board');if(!box)return;
    const old=$('.rf-favourites-list',box);if(old)old.remove();
    const list=document.createElement('div');list.className='rf-favourites-list rf-card-list';
    if(!state.favourites.length){const empty=document.createElement('p');empty.className='rf-empty';empty.textContent='No favourite stops saved on this device yet. Save a stop from its live arrivals.';list.append(empty)}
    state.favourites.forEach(stop=>{
      const card=document.createElement('div');card.className='rf-card';
      const name=document.createElement('h3');name.textContent=stop.name;
      const meta=document.createElement('p');meta.textContent='TfL stop '+stop.id;
      const open=document.createElement('button');open.type='button';open.className='rf-fav-action';open.textContent='View live arrivals';open.addEventListener('click',()=>loadFavourite(stop));
      const remove=document.createElement('button');remove.type='button';remove.className='rf-fav-action';remove.textContent='Remove';remove.addEventListener('click',()=>toggleFavourite(stop));
      card.append(name,meta,open,remove);list.append(card);
    });
    box.append(list);
  }
  async function loadFavourite(stop){
    const target=$('#nearArrivals');if(!target)return;
    target.innerHTML='<p class="rf-empty">Loading live arrivals…</p>';
    try{const rows=await get('/StopPoint/'+encodeURIComponent(stop.id)+'/Arrivals');rows.sort((a,b)=>a.timeToStation-b.timeToStation);target.replaceChildren(...rows.slice(0,8).map(makeArrival));if(!rows.length)target.textContent='No arrivals currently returned by TfL.';const title=$('.stop-heading strong');if(title)title.textContent=stop.name;announce('Live arrivals loaded for '+stop.name)}
    catch{target.textContent='Could not load live arrivals for '+stop.name+'.'}
  }
  function renderDashboard(){
    const page=$('#dashboard');if(!page)return;const cards=$('.cards',page);if(!cards)return;cards.innerHTML='';
    const fav=document.createElement('article');fav.className='update-card';const fh=document.createElement('h2');fh.textContent='Favourite stops';fav.append(fh);
    if(!state.favourites.length){const p=document.createElement('p');p.textContent='No favourite stops saved yet. Save one from live arrivals.';fav.append(p)}
    state.favourites.forEach(stop=>{const row=document.createElement('div');row.className='rf-toolbar';const label=document.createElement('strong');label.textContent=stop.name;const open=document.createElement('button');open.type='button';open.className='rf-fav-action';open.textContent='Live arrivals';open.addEventListener('click',()=>{loadFavourite(stop);document.querySelector('[data-page="home"]')?.click()});row.append(label,open);fav.append(row)});
    const tracked=document.createElement('article');tracked.className='update-card';const th=document.createElement('h2');th.textContent='Tracked vehicles';tracked.append(th);const p=document.createElement('p');p.textContent=state.vehicles.length?state.vehicles.join(' · '):'No vehicles tracked on this device yet.';tracked.append(p);
    const privacy=document.createElement('p');privacy.className='rf-data-footnote';privacy.textContent='Your saved lists are stored in this browser only; they are not synced to an account.';cards.append(fav,tracked,privacy);
  }
  function renderTrackedVehicles(){
    const page=$('#fleet');if(!page)return;
    const cards=$('.cards',page);if(!cards)return;
    cards.innerHTML='';
    const intro=document.createElement('article');intro.className='update-card';intro.innerHTML='<h2>Tracked vehicles</h2><p>Save vehicle IDs from live arrivals to build a personal watchlist on this device.</p>';
    const form=document.createElement('form');form.className='rf-toolbar';form.innerHTML='<label class="rf-announce" for="rfVehicleId">Vehicle ID</label><input id="rfVehicleId" placeholder="Enter a vehicle ID" autocomplete="off" required><button class="rf-fav-action" type="submit">Track vehicle</button>';
    form.addEventListener('submit',e=>{e.preventDefault();const input=$('#rfVehicleId',form);const id=input.value.trim().toUpperCase().replace(/\s+/g,'');if(!id)return;if(!state.vehicles.includes(id))state.vehicles.unshift(id);state.vehicles=state.vehicles.slice(0,100);persist();renderTrackedVehicles();renderDashboard();announce('Vehicle '+id+' added to your watchlist')});
    cards.append(intro,form);
    if(!state.vehicles.length){const empty=document.createElement('p');empty.className='rf-empty';empty.textContent='Your watchlist is empty. Add a fleet number or vehicle ID to get started.';cards.append(empty);return}
    const list=document.createElement('div');list.className='rf-card-list';
    state.vehicles.forEach(id=>{const card=document.createElement('article');card.className='rf-card';const h=document.createElement('h3');h.textContent=id;const p=document.createElement('p');p.textContent='Tracked on this device';const remove=document.createElement('button');remove.type='button';remove.className='rf-fav-action';remove.textContent='Stop tracking';remove.addEventListener('click',()=>{state.vehicles=state.vehicles.filter(v=>v!==id);persist();renderTrackedVehicles();renderDashboard()});card.append(h,p,remove);list.append(card)});
    cards.append(list);
  }
  function wireSearch(){
    document.querySelectorAll('.header-search,.command-search').forEach(form=>form.addEventListener('submit',e=>{e.preventDefault();const input=$('input',form);const q=input?.value.trim();if(!q)return;if(typeof window.search==='function')window.search(q);else if(typeof window.smartSearch==='function')window.smartSearch(q);else{const target=$('#arrivalSearch');if(target){target.value=q;target.dispatchEvent(new Event('input',{bubbles:true}))}}}));
  }
  function wireNavigation(){
    document.querySelectorAll('[data-page="fleet"]').forEach(button=>button.addEventListener('click',()=>setTimeout(renderTrackedVehicles,0)));
    document.querySelectorAll('[data-page="dashboard"]').forEach(button=>button.addEventListener('click',()=>setTimeout(renderFavourites,0)));
    document.querySelectorAll('[data-page="home"]').forEach(button=>button.addEventListener('click',()=>setTimeout(loadHomeStop,0)));
  }
  function removeFakeCards(){
    const activity=$('.activity-card');if(activity){const body=activity.querySelectorAll('.activity-row');body.forEach(row=>row.remove());const p=document.createElement('p');p.className='rf-empty';p.textContent='Your searches and vehicle views will appear here as you use RouteFlow.';activity.append(p)}
    document.querySelectorAll('.favourite-stop').forEach(el=>el.remove());
    const fakeJourney=$('.journey-board');if(fakeJourney){const p=$('p',fakeJourney);if(p)p.textContent='Enter your real starting point and destination in Journey Planner.';const meta=$('.journey-meta',fakeJourney);if(meta)meta.textContent='Live TfL journey options';}
  }
  function start(){
    installAccessibility();wireSearch();wireNavigation();removeFakeCards();renderFavourites();renderTrackedVehicles();renderDashboard();loadStatus();loadHomeStop();
    // Refresh real network information at a modest interval while the page is visible.
    window.setInterval(()=>{if(!document.hidden){loadStatus();loadHomeStop()}},60000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();