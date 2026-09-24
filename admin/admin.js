(() => {
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=v=>{const d=document.createElement('div');d.textContent=v??'';return d.innerHTML};
let db=null,projects=[],sections=[],media=[];let editingProject=null,editingSection=null;let projectCover=null,projectGallery=[],sectionGallery=[];let pickerMode='';
let uploadJobs=[],uploadActive=false;
const BUILTIN_GROUPS=['branding','social'];
const BUCKETS=['site-media','project-images'];
// Must match public.is_admin() allowlist in supabase-schema.sql
const ADMIN_EMAILS=['yassinahmed21106@gmail.com'];
function isAdminUser(user){const email=(user?.email||'').toLowerCase();return !!email&&ADMIN_EMAILS.some(e=>e.toLowerCase()===email)}
function msg(x){alert(x)}
function errText(e){return e?.message||String(e)}
async function getDb(){
 if(db)return db;
 if(!window.YASupabase?.getClient)throw new Error('Supabase client loader is missing.');
 db=await window.YASupabase.getClient();
 if(!db||!db.auth||!db.from)throw new Error('Supabase client could not be initialized.');
 return db;
}
async function storage(){const c=await getDb();if(!c.storage)throw new Error('Supabase Storage is unavailable. Check Supabase configuration.');return c.storage}
async function loadAll(){
 const c=await getDb();
 const [pr,se,me]=await Promise.all([c.from('projects').select('*').order('section').order('sort_order'),c.from('sections').select('*').order('sort_order'),c.from('media').select('*').order('created_at',{ascending:false})]);
 if(pr.error)throw pr.error;if(se.error)throw se.error;projects=pr.data||[];sections=se.data||[];media=me.error?[]:(me.data||[]);
 renderAll();
}
function renderAll(){renderSections();renderProjects();renderMedia();$('#connection').textContent=`Connected · ${projects.length} projects · ${sections.length} sections`}
function groups(){const s=new Set(BUILTIN_GROUPS);projects.forEach(p=>p.section&&s.add(p.section));return [...s]}
function label(g){return String(g||'').replace(/[-_]/g,' ').replace(/\b\w/g,x=>x.toUpperCase())}
function renderSections(){
 const host=$('#existing-sections');host.innerHTML='';
 if(!sections.length){host.innerHTML='<div class="notice">No sections loaded. Run the supplied supabase-schema.sql once.</div>';return}
 sections.forEach((s,i)=>{const r=document.createElement('div');r.className='row';r.innerHTML=`<div class="drag">↕</div><div><div class="row-title">${esc(s.title||label(s.key)||'Untitled')} <span class="badge">${esc(s.type)}</span><span class="badge ${s.visible?'live':''}">${s.visible?'Visible':'Hidden'}</span></div><div class="row-meta">${esc(s.key||'New section')} · ${esc(s.subtitle||s.content||'No description')}</div></div><div class="row-actions"><button class="btn secondary mini" data-up>↑</button><button class="btn secondary mini" data-down>↓</button><button class="btn secondary mini" data-edit>Edit</button><button class="btn secondary mini" data-toggle>${s.visible?'Hide':'Show'}</button>${s.type==='built-in'?'':'<button class="btn danger mini" data-delete>Delete</button>'}</div>`;r.querySelector('[data-edit]').onclick=()=>openSection(s);r.querySelector('[data-toggle]').onclick=()=>toggleSection(s);r.querySelector('[data-delete]')?.addEventListener('click',()=>deleteSection(s));r.querySelector('[data-up]').onclick=()=>moveSection(i,-1);r.querySelector('[data-down]').onclick=()=>moveSection(i,1);host.appendChild(r)})
}
async function moveSection(i,d){const j=i+d;if(j<0||j>=sections.length)return;const c=await getDb(),a=sections[i],b=sections[j];const x=await c.from('sections').update({sort_order:b.sort_order}).eq('id',a.id);const y=await c.from('sections').update({sort_order:a.sort_order}).eq('id',b.id);if(x.error||y.error)return msg(errText(x.error||y.error));await loadAll()}
function openSection(s){editingSection=s;sectionGallery=[];$('#section-title').textContent=s?'Edit Existing Section':'New Section';$('#s-type').value=s?.type==='built-in'?'text':(s?.type||'text');$('#s-type').disabled=!!s;$('#s-title').value=s?.title||'';$('#s-subtitle').value=s?.subtitle||'';$('#s-content').value=s?.content||'';$('#s-label').value=s?.link_label||'';$('#s-url').value=s?.link_url||'';$('#s-visible').value=String(s?.visible??true);$('#section-error').textContent='';$('#section-modal').hidden=false;if(s)loadSectionMedia(s.id);else renderSectionMedia()}
async function loadSectionMedia(id){try{const c=await getDb();const r=await c.from('section_media').select('id,media_id,sort_order,media(url,media_type,filename)').eq('section_id',id).order('sort_order');if(r.error)throw r.error;sectionGallery=(r.data||[]).map(x=>({linkId:x.id,id:x.media_id,url:x.media?.url,type:x.media?.media_type||'image',filename:x.media?.filename||''}));renderSectionMedia()}catch(e){$('#section-error').textContent=errText(e)}}
function renderSectionMedia(){$('#section-media').innerHTML=sectionGallery.map((m,i)=>mediaItem(m,i)).join('');$('#section-media').querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>removeSectionMedia(+b.dataset.remove))}
function mediaItem(m,i){return `<div class="gallery-item"><${m.type==='video'?'video controls muted':'img'} src="${esc(m.url||m.preview)}" ${m.type==='video'?'':'alt=""'}></${m.type==='video'?'video':'img'}><button type="button" class="remove-media" data-remove="${i}">×</button></div>`}
async function removeSectionMedia(i){const m=sectionGallery[i];sectionGallery.splice(i,1);if(m?.linkId){const c=await getDb();const r=await c.from('section_media').delete().eq('id',m.linkId);if(r.error)msg(errText(r.error))}renderSectionMedia()}
$('#section-upload').onchange=e=>{for(const f of e.target.files)sectionGallery.push({file:f,preview:URL.createObjectURL(f),type:f.type.startsWith('video/')?'video':'image'});renderSectionMedia();e.target.value=''};
$('#section-library').onclick=()=>openPicker('section');
$('#section-form').onsubmit=async e=>{e.preventDefault();const er=$('#section-error');er.textContent='';try{const c=await getDb();const payload={type:editingSection?editingSection.type:$('#s-type').value,title:$('#s-title').value.trim()||null,subtitle:$('#s-subtitle').value.trim()||null,content:$('#s-content').value.trim()||null,link_label:$('#s-label').value.trim()||null,link_url:$('#s-url').value.trim()||null,visible:$('#s-visible').value==='true'};let id=editingSection?.id;if(id){const r=await c.from('sections').update(payload).eq('id',id);if(r.error)throw r.error}else{payload.sort_order=sections.length;const r=await c.from('sections').insert(payload).select().single();if(r.error)throw r.error;id=r.data.id}
 for(let i=0;i<sectionGallery.length;i++){const m=sectionGallery[i];if(m.linkId){const r=await c.from('section_media').update({sort_order:i}).eq('id',m.linkId);if(r.error)throw r.error}else{let mid=m.id;if(m.file)mid=(await uploadMedia(m.file,`sections/${id}`)).id;if(mid){const r=await c.from('section_media').insert({section_id:id,media_id:mid,sort_order:i});if(r.error)throw r.error}}}
 await loadAll();$('#section-modal').hidden=true}catch(x){er.textContent=errText(x)}};
async function toggleSection(s){const c=await getDb(),r=await c.from('sections').update({visible:!s.visible}).eq('id',s.id);if(r.error)return msg(errText(r.error));await loadAll()}
async function deleteSection(s){if(!confirm(`Delete ${s.title||s.key}?`))return;const c=await getDb(),r=await c.from('sections').delete().eq('id',s.id);if(r.error)return msg(errText(r.error));await loadAll()}
function renderProjects(){const host=$('#existing-projects');host.innerHTML='';const gs=groups();gs.forEach(g=>{const ps=projects.filter(p=>p.section===g).sort((a,b)=>(a.sort_order??0)-(b.sort_order??0));if(!ps.length&& !BUILTIN_GROUPS.includes(g))return;const box=document.createElement('div');box.className='group';box.innerHTML=`<div class="group-head"><h4>${esc(label(g))}</h4><span>${ps.length} project${ps.length===1?'':'s'}</span></div><div class="list"></div>`;const list=box.querySelector('.list');ps.forEach((p,i)=>{const r=document.createElement('div');r.className='row project-row';r.innerHTML=`<img class="thumb" src="${esc(p.cover_image||'')}" onerror="this.style.opacity=.15"><div><div class="row-title">${esc(p.title)} <span class="badge ${p.published?'live':''}">${p.published?'Visible':'Hidden'}</span></div><div class="row-meta">${esc(p.category||'')} ${p.year?'· '+esc(p.year):''} · ${esc(label(p.section))}</div></div><div class="row-actions"><button class="btn secondary mini" data-up>↑</button><button class="btn secondary mini" data-down>↓</button><button class="btn secondary mini" data-edit>Edit</button><button class="btn secondary mini" data-toggle>${p.published?'Hide':'Show'}</button><button class="btn danger mini" data-delete>Delete</button></div>`;r.querySelector('[data-edit]').onclick=()=>openProject(p);r.querySelector('[data-toggle]').onclick=()=>toggleProject(p);r.querySelector('[data-delete]').onclick=()=>deleteProject(p);r.querySelector('[data-up]').onclick=()=>moveProject(ps,i,-1);r.querySelector('[data-down]').onclick=()=>moveProject(ps,i,1);list.appendChild(r)});host.appendChild(box)})}
async function moveProject(list,i,d){const j=i+d;if(j<0||j>=list.length)return;const c=await getDb(),a=list[i],b=list[j];let r=await c.from('projects').update({sort_order:b.sort_order}).eq('id',a.id);if(r.error)return msg(errText(r.error));r=await c.from('projects').update({sort_order:a.sort_order}).eq('id',b.id);if(r.error)return msg(errText(r.error));await loadAll()}
function fillGroups(selected){const gs=groups();$('#p-group').innerHTML=gs.map(g=>`<option value="${esc(g)}">${esc(label(g))}</option>`).join('')+`<option value="__new__">+ Create New Group</option>`;$('#p-group').value=selected&&gs.includes(selected)?selected:(gs[0]||'branding');$('#new-group-box').hidden=$('#p-group').value!=='__new__'}
$('#p-group').onchange=e=>$('#new-group-box').hidden=e.target.value!=='__new__';
function normalize(arr){return (arr||[]).map(x=>typeof x==='string'?{url:x,type:'image'}:{url:x.url,type:x.type||'image'}).filter(x=>x.url)}
function openProject(p){
 editingProject=p;
 projectCover=p?.cover_image?{url:p.cover_image,type:'image'}:null;
 const coverUrl=p?.cover_image||'';
 projectGallery=normalize(p?.images).filter(m=>!coverUrl||m.url!==coverUrl);
 $('#project-title').textContent=p?'Edit Existing Project':'New Project';
 $('#p-name').value=p?.title||'';$('#p-year').value=p?.year||'';$('#p-category').value=p?.category||'';
 $('#p-description').value=p?.description||'';$('#p-url').value=p?.project_url||'';
 $('#p-tags').value=(p?.tags||[]).join(', ');$('#p-visible').value=String(p?.published??true);
 $('#p-spacing').value=String(Number.isFinite(Number(p?.content_spacing))?p.content_spacing:32);
 updateSpacingControl();fillGroups(p?.section);$('#p-new-group').value='';
 $('#project-error').textContent='';$('#project-upload-status').textContent='';renderCover();renderGallery();
 $('#project-modal').hidden=false;
}
function updateSpacingControl(){const value=Math.max(0,Math.min(120,Number($('#p-spacing').value)||0));$('#p-spacing-value').value=value;$('#p-spacing-value').textContent=value;$('#spacing-preview').style.setProperty('--preview-gap',value+'px')}
$('#p-spacing').oninput=updateSpacingControl;
function renderCover(){$('#cover').innerHTML=projectCover?`<img src="${esc(projectCover.url||projectCover.preview)}" alt="">`:'No cover selected'}
function renderGallery(){$('#gallery').innerHTML=projectGallery.map((m,i)=>mediaItem(m,i)).join('');$('#gallery').querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{projectGallery.splice(+b.dataset.remove,1);renderGallery()})}
$('#cover-remove').onclick=()=>{projectCover=null;renderCover()};
$('#cover-upload').onchange=e=>{const f=e.target.files[0];if(f)projectCover={file:f,preview:URL.createObjectURL(f),type:'image'};renderCover();e.target.value=''};
$('#gallery-upload').onchange=e=>{for(const f of e.target.files)projectGallery.push({file:f,preview:URL.createObjectURL(f),type:f.type.startsWith('video/')?'video':'image'});renderGallery();e.target.value=''};
$('#cover-library').onclick=()=>openPicker('cover');$('#gallery-library').onclick=()=>openPicker('gallery');

async function uploadProjectFiles(files, folder){
 if(!files.length)return [];
 const results=new Array(files.length);let next=0;const workers=Array.from({length:Math.min(3,files.length)},async()=>{
  while(next<files.length){const i=next++;const f=files[i];
   results[i]=await uploadMedia(f,folder,loaded=>{
    const done=files.reduce((sum,x,j)=>sum+(j<i?x.size:(j===i?loaded:0)),0);
    const total=files.reduce((sum,x)=>sum+x.size,0)||1;
    $('#project-upload-status').textContent=`Uploading project media: ${Math.round(done/total*100)}%`;
   });
  }
 });
 await Promise.all(workers);return results;
}

$('#project-form').onsubmit=async e=>{e.preventDefault();if(uploadActive)return;const er=$('#project-error');er.textContent='';$('#project-upload-status').textContent='';try{
 const c=await getDb();let group=$('#p-group').value;if(group==='__new__'){group=$('#p-new-group').value.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');if(!group)throw new Error('Enter a new group name.')}
 const spacing=Math.max(0,Math.min(120,Number($('#p-spacing').value)||0));
 const payload={title:$('#p-name').value.trim(),year:$('#p-year').value.trim()||'',category:$('#p-category').value.trim()||'',description:$('#p-description').value.trim()||'',section:group,project_url:$('#p-url').value.trim()||null,tags:$('#p-tags').value.split(',').map(x=>x.trim()).filter(Boolean),published:$('#p-visible').value==='true',content_spacing:spacing};
 if(!payload.title)throw new Error('Project name is required.');let id=editingProject?.id;
 if(!id){payload.slug=uniqueSlug(payload.title);payload.sort_order=projects.filter(p=>p.section===group).length;payload.cover_image=null;payload.images=[];const r=await c.from('projects').insert(payload).select().single();if(r.error)throw r.error;id=r.data.id}
 else{let r=await c.from('projects').update(payload).eq('id',id);if(r.error)throw r.error}
 let coverUrl=projectCover?.url||null;if(projectCover?.file){$('#project-upload-status').textContent='Uploading cover: 0%';coverUrl=(await uploadMedia(projectCover.file,`projects/${id}`,loaded=>$('#project-upload-status').textContent=`Uploading cover: ${Math.round(loaded/projectCover.file.size*100)}%`)).url}
 const galleryEntries=projectGallery.filter(m=>!coverUrl||m.url!==coverUrl);const fileEntries=galleryEntries.filter(m=>m.file);const uploaded=await uploadProjectFiles(fileEntries.map(m=>m.file),`projects/${id}`);let uploadedIndex=0;
 const imgs=galleryEntries.map(m=>m.file?{url:uploaded[uploadedIndex++].url,type:m.type}:{url:m.url,type:m.type});
 let r=await c.from('projects').update({cover_image:coverUrl,images:imgs,content_spacing:spacing}).eq('id',id);if(r.error)throw r.error;
 $('#project-upload-status').textContent='';await loadAll();$('#project-modal').hidden=true;
 }catch(x){er.textContent=errText(x);$('#project-upload-status').textContent=''} };
function uniqueSlug(t){let b=t.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')||'project',s=b,n=2,u=new Set(projects.map(p=>p.slug));while(u.has(s))s=`${b}-${n++}`;return s}
async function toggleProject(p){const c=await getDb(),r=await c.from('projects').update({published:!p.published}).eq('id',p.id);if(r.error)return msg(errText(r.error));await loadAll()}
async function deleteProject(p){if(!confirm(`Delete "${p.title}"?`))return;const c=await getDb(),r=await c.from('projects').delete().eq('id',p.id);if(r.error)return msg(errText(r.error));await loadAll()}
function existingAssets(){const map=new Map();media.forEach(m=>map.set(m.url,m));projects.forEach(p=>{if(p.cover_image&&!map.has(p.cover_image))map.set(p.cover_image,{id:null,url:p.cover_image,media_type:'image',filename:`${p.title} — existing cover`,siteAsset:true});normalize(p.images).forEach((x,i)=>{if(!map.has(x.url))map.set(x.url,{id:null,url:x.url,media_type:x.type,filename:`${p.title} — gallery ${i+1}`,siteAsset:true})})});return [...map.values()]}
function renderMedia(){const host=$('#media-grid'),items=existingAssets();host.innerHTML=items.length?items.map(m=>`<div class="media-card"><${m.media_type==='video'?'video controls muted':'img'} src="${esc(m.url)}" ${m.media_type==='video'?'':'alt="" loading="lazy" decoding="async"'}></${m.media_type==='video'?'video':'img'}><div class="media-info">${esc(m.filename||'Media')}${m.siteAsset?'<br>Existing site asset':m.id?`<br><button class="btn danger mini" data-delete="${m.id}">Delete</button>`:''}</div></div>`).join(''):'<div class="notice">No media found. Existing project covers will appear here automatically once projects are loaded.</div>';host.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deleteMedia(b.dataset.delete))}
async function openPicker(mode){pickerMode=mode;$('#picker-title').textContent=mode==='cover'?'Choose Project Cover':mode==='gallery'?'Add Project Media':'Add Section Media';const items=(mode==='section'?existingAssets().filter(m=>m.id):existingAssets());$('#picker-grid').innerHTML=items.length?items.map((m,i)=>`<div class="media-card picker-card" data-pick="${i}"><${m.media_type==='video'?'video controls muted':'img'} src="${esc(m.url)}" ${m.media_type==='video'?'':'alt="" loading="lazy" decoding="async"'}></${m.media_type==='video'?'video':'img'}><div class="media-info">${esc(m.filename||'Media')}</div></div>`).join(''):'<div class="notice">No existing media is registered yet. Use + Upload.</div>';$('#picker-grid').querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{const m=items[+b.dataset.pick];if(mode==='cover'){projectCover={url:m.url,type:m.media_type}}else if(mode==='gallery'){projectGallery.push({url:m.url,type:m.media_type,filename:m.filename})}else{sectionGallery.push({id:m.id,url:m.url,type:m.media_type,filename:m.filename})}if(mode==='cover')renderCover();if(mode==='gallery')renderGallery();if(mode==='section')renderSectionMedia();$('#picker-modal').hidden=true});$('#picker-modal').hidden=false}
async function uploadMedia(file,folder,onProgress){
 const c=await getDb();const {data:{session}}=await c.auth.getSession();if(!session?.access_token)throw new Error('Your admin session expired. Please sign in again.');
 let lastError=null;
 for(const bucket of BUCKETS){
  const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'-');const path=`${folder}/${Date.now()}-${Math.random().toString(36).slice(2,8)}-${safe}`;
  try{
   await new Promise((resolve,reject)=>{
    const xhr=new XMLHttpRequest();
    xhr.open('POST',`${c.supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${path.split('/').map(encodeURIComponent).join('/')}`);
    xhr.setRequestHeader('Authorization',`Bearer ${session.access_token}`);xhr.setRequestHeader('apikey',c.supabaseKey);xhr.setRequestHeader('Content-Type',file.type||'application/octet-stream');xhr.setRequestHeader('x-upsert','false');
    xhr.upload.onprogress=e=>{if(e.lengthComputable&&onProgress)onProgress(e.loaded,e.total)};
    xhr.onload=()=>{if(xhr.status>=200&&xhr.status<300){if(onProgress)onProgress(file.size,file.size);resolve()}else{let message=`Upload failed (${xhr.status}).`;try{const body=JSON.parse(xhr.responseText);message=body.message||body.error||message}catch{}reject(new Error(message))}};
    xhr.onerror=()=>reject(new Error('Network error while uploading.'));
    xhr.onabort=()=>reject(new Error('Upload was interrupted.'));
    xhr.send(file);
   });
   const url=c.storage.from(bucket).getPublicUrl(path)?.data?.publicUrl;if(!url)throw new Error('Upload succeeded but no public URL was returned.');
   const r=await c.from('media').insert({url,storage_path:`${bucket}/${path}`,media_type:file.type.startsWith('video/')?'video':'image',filename:file.name}).select().single();
   if(r.error)throw r.error;return r.data;
  }catch(e){lastError=e}
 }
 throw new Error(`${lastError?.message||'Upload failed'}. Make sure one of the storage buckets (${BUCKETS.join(', ')}) exists and authenticated upload policies are enabled.`)
}

function renderUploadProgress(){
 const box=$('#upload-progress');if(!box)return;box.hidden=!uploadJobs.length;
 const totalBytes=uploadJobs.reduce((s,j)=>s+j.total,0)||1;const loadedBytes=uploadJobs.reduce((s,j)=>s+j.loaded,0);const pct=Math.min(100,Math.round(loadedBytes/totalBytes*100));
 const done=uploadJobs.filter(j=>j.status==='done').length;const remaining=uploadJobs.filter(j=>j.status==='pending'||j.status==='uploading').length;
 $('#upload-progress-title').textContent=`Uploading media: ${pct}%`;$('#upload-progress-count').textContent=`${done} / ${uploadJobs.length} files uploaded`;$('#upload-progress-bar').style.width=pct+'%';$('#upload-progress-remaining').textContent=`${remaining} files remaining`;
 $('#upload-progress-files').innerHTML=uploadJobs.map((j,i)=>`<div class="upload-file-row"><span class="upload-file-name">${esc(j.file.name)}</span><span class="upload-file-status ${j.status==='done'?'done':j.status==='failed'?'failed':''}" title="${esc(j.error||'')}">${j.status==='done'?'Completed':j.status==='failed'?'Failed: '+esc(j.error||'Upload failed'):j.status==='uploading'?Math.round(j.loaded/(j.total||1)*100)+'%':'Waiting'}</span><span class="file-progress-track"><span class="file-progress-bar" style="width:${Math.min(100,Math.round(j.loaded/(j.total||1)*100))}%"></span></span></div>`).join('');
 const retry=$('#retry-failed');retry.hidden=uploadActive||!uploadJobs.some(j=>j.status==='failed');
}
async function processUploadJob(job){job.status='uploading';job.loaded=0;renderUploadProgress();try{await uploadMedia(job.file,'library',(loaded,total)=>{job.loaded=loaded;job.total=total||job.total;renderUploadProgress()});job.status='done';job.loaded=job.total}catch(e){job.status='failed';job.error=errText(e)}renderUploadProgress()}
async function runLibraryUploads(){if(uploadActive)return;uploadActive=true;setUploadControlsDisabled(true);renderUploadProgress();try{let cursor=0;const worker=async()=>{while(cursor<uploadJobs.length){const job=uploadJobs[cursor++];if(job.status==='done')continue;await processUploadJob(job)}};await Promise.all(Array.from({length:Math.min(3,uploadJobs.length)},worker));await loadAll();if(pickerMode)openPicker(pickerMode);$('#media-status').textContent=uploadJobs.some(j=>j.status==='failed')?'Some uploads failed. You can retry them.':'Upload complete.'}catch(e){$('#media-status').textContent=errText(e)}finally{uploadActive=false;setUploadControlsDisabled(false);renderUploadProgress()}}
function setUploadControlsDisabled(disabled){$$('#library-upload,#picker-upload').forEach(input=>{input.disabled=disabled;const label=input.closest('label');if(label)label.classList.toggle('is-disabled',disabled)})}
function startLibraryUpload(files){if(uploadActive||!files.length)return;uploadJobs=files.map(file=>({file,total:file.size||1,loaded:0,status:'pending',error:''}));$('#media-status').textContent=`Preparing ${files.length} file(s)…`;renderUploadProgress();runLibraryUploads()}
$('#retry-failed').onclick=()=>{if(uploadActive)return;uploadJobs.filter(j=>j.status==='failed').forEach(j=>{j.status='pending';j.loaded=0;j.error=''});runLibraryUploads()};
$('#library-upload').onchange=e=>{startLibraryUpload([...e.target.files]);e.target.value=''};$('#picker-upload').onchange=e=>{startLibraryUpload([...e.target.files]);e.target.value=''};
$$('[data-close]').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).hidden=true);
$$('.nav').forEach(b=>b.onclick=()=>{$$('.nav').forEach(x=>x.classList.remove('active'));b.classList.add('active');$$('.view').forEach(v=>v.hidden=v.id!==`view-${b.dataset.view}`)});
$$('[data-manage]').forEach(b=>b.onclick=()=>{const x=b.dataset.manage;$('#manage-sections').hidden=x!=='sections';$('#manage-projects').hidden=x!=='projects';$$('[data-manage]').forEach(y=>y.classList.remove('active-card'));b.classList.add('active-card')});
$('#create-project').onclick=()=>openProject(null);$('#create-section').onclick=()=>openSection(null);
async function enterApp(session){
 if(!session||!isAdminUser(session.user)){
  $('#app').hidden=true;$('#login').hidden=false;
  if(session){await (await getDb()).auth.signOut();$('#login-error').textContent='This account is not authorized for admin access.';}
  return;
 }
 $('#login').hidden=true;$('#app').hidden=false;$('#login-error').textContent='';
 await loadAll();
}
async function start(){try{const c=await getDb();const {data:{session}}=await c.auth.getSession();await enterApp(session);c.auth.onAuthStateChange(async(_e,s)=>{try{await enterApp(s)}catch(e){msg(errText(e))}})}catch(e){$('#login-error').textContent=errText(e)}}
$('#login-form').onsubmit=async e=>{e.preventDefault();$('#login-error').textContent='';try{const c=await getDb();const r=await c.auth.signInWithPassword({email:$('#email').value.trim(),password:$('#password').value});if(r.error)throw r.error;if(!isAdminUser(r.data.user)){await c.auth.signOut();throw new Error('This account is not authorized for admin access.');}}catch(x){$('#login-error').textContent=errText(x)}};$('#logout').onclick=async()=>{try{await (await getDb()).auth.signOut()}catch(e){msg(errText(e))}};
start();
})();
