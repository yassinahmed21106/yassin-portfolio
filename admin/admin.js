(() => {
  'use strict';

  const BUCKET = 'project-images';
  let client = null;
  let projects = [];
  let currentEditId = null; // null while creating a brand-new (unsaved) project

  const $ = (sel, root = document) => root.querySelector(sel);

  const loginScreen = $('#login-screen');
  const dashboard = $('#dashboard');
  const loginForm = $('#login-form');
  const loginError = $('#login-error');

  const listBranding = $('#list-branding');
  const listSocial = $('#list-social');

  const overlay = $('#editor-overlay');
  const editorForm = $('#editor-form');
  const editorTitle = $('#editor-title');
  const editorError = $('#editor-error');
  const imageSection = $('#image-section');
  const imageSaveHint = $('#image-save-hint');
  const coverPreview = $('#cover-preview');
  const coverInput = $('#cover-input');
  const galleryList = $('#gallery-list');
  const galleryInput = $('#gallery-input');

  const f = {
    title: $('#f-title'), section: $('#f-section'), year: $('#f-year'),
    category: $('#f-category'), description: $('#f-description'),
    url: $('#f-url'), tags: $('#f-tags'), published: $('#f-published')
  };

  let workingImages = []; // gallery urls for the project currently open in the editor

  function slugify(text){
    return (text || '').toString().toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'project';
  }

  function storagePathFromUrl(url){
    const marker = `/object/public/${BUCKET}/`;
    const idx = (url || '').indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.slice(idx + marker.length));
  }

  async function removeFromStorage(url){
    const path = storagePathFromUrl(url);
    if (!path) return;
    try { await client.storage.from(BUCKET).remove([path]); } catch (e) { /* best effort */ }
  }

  /* ---------------------------------------------------------
     Auth
  --------------------------------------------------------- */
  async function boot(){
    try {
      client = await window.YASupabase.getClient();
    } catch (e) {
      loginError.textContent = 'Supabase is not configured yet — add SUPABASE_URL and SUPABASE_ANON_KEY in Vercel, then redeploy.';
      return;
    }
    const { data: { session } } = await client.auth.getSession();
    showScreen(!!session);
    client.auth.onAuthStateChange((_event, sess) => showScreen(!!sess));
  }

  function showScreen(isAuthed){
    loginScreen.hidden = isAuthed;
    dashboard.hidden = !isAuthed;
    if (isAuthed) loadProjects();
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    const email = $('#login-email').value.trim();
    const password = $('#login-password').value;
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) loginError.textContent = error.message;
  });

  $('#logout-btn').addEventListener('click', () => client.auth.signOut());

  /* ---------------------------------------------------------
     Load + render project lists
  --------------------------------------------------------- */
  async function loadProjects(){
    const { data, error } = await client
      .from('projects')
      .select('*')
      .order('section', { ascending: true })
      .order('sort_order', { ascending: true });
    if (error) { alert('Could not load projects: ' + error.message); return; }
    projects = data || [];
    renderLists();
  }

  function renderLists(){
    listBranding.innerHTML = '';
    listSocial.innerHTML = '';
    projects.filter(p => p.section === 'branding').forEach(p => listBranding.appendChild(renderRow(p)));
    projects.filter(p => p.section === 'social').forEach(p => listSocial.appendChild(renderRow(p)));
  }

  function renderRow(project){
    const li = document.createElement('li');
    li.className = 'project-row';
    li.draggable = true;
    li.dataset.id = project.id;

    li.innerHTML = `
      <span class="drag-handle" title="Drag to reorder">⠿</span>
      <div class="project-row-info">
        <div class="project-row-title">${escapeHtml(project.title)} <span class="status-pill ${project.published ? 'is-published' : ''}">${project.published ? 'Published' : 'Draft'}</span></div>
        <div class="project-row-meta">${escapeHtml(project.category || '')} ${project.year ? '· ' + escapeHtml(project.year) : ''}</div>
      </div>
      <div class="project-row-actions">
        <button type="button" class="admin-mini-btn" data-action="edit">Edit</button>
        <button type="button" class="admin-mini-btn" data-action="duplicate">Duplicate</button>
        <button type="button" class="admin-mini-btn" data-action="toggle">${project.published ? 'Unpublish' : 'Publish'}</button>
        <button type="button" class="admin-mini-btn" data-action="delete">Delete</button>
      </div>
    `;

    li.querySelector('[data-action="edit"]').addEventListener('click', () => openEditor(project));
    li.querySelector('[data-action="duplicate"]').addEventListener('click', () => duplicateProject(project));
    li.querySelector('[data-action="toggle"]').addEventListener('click', () => togglePublish(project));
    li.querySelector('[data-action="delete"]').addEventListener('click', () => deleteProject(project));

    addDragHandlers(li, listForSection(project.section));
    return li;
  }

  function listForSection(section){ return section === 'branding' ? listBranding : listSocial; }
  function escapeHtml(s){ const d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }

  /* ---------------------------------------------------------
     Drag-and-drop reordering (project rows)
  --------------------------------------------------------- */
  function addDragHandlers(li, listEl){
    li.addEventListener('dragstart', () => li.classList.add('is-dragging'));
    li.addEventListener('dragend', async () => {
      li.classList.remove('is-dragging');
      await persistOrder(listEl);
    });
    li.addEventListener('dragover', (e) => {
      e.preventDefault();
      const dragging = listEl.querySelector('.is-dragging');
      if (!dragging || dragging === li) return;
      const rect = li.getBoundingClientRect();
      const before = (e.clientY - rect.top) < rect.height / 2;
      listEl.insertBefore(dragging, before ? li : li.nextSibling);
    });
  }

  async function persistOrder(listEl){
    const ids = Array.from(listEl.children).map(li => li.dataset.id);
    const updates = ids.map((id, index) => client.from('projects').update({ sort_order: index }).eq('id', id));
    await Promise.all(updates);
    ids.forEach((id, index) => {
      const p = projects.find(x => x.id === id);
      if (p) p.sort_order = index;
    });
  }

  /* ---------------------------------------------------------
     Publish toggle / duplicate / delete
  --------------------------------------------------------- */
  async function togglePublish(project){
    const { error } = await client.from('projects').update({ published: !project.published }).eq('id', project.id);
    if (error) return alert(error.message);
    project.published = !project.published;
    renderLists();
  }

  async function duplicateProject(project){
    const sectionCount = projects.filter(p => p.section === project.section).length;
    const copy = {
      title: project.title + ' (Copy)',
      category: project.category, section: project.section, description: project.description,
      cover_image: project.cover_image, images: project.images || [], project_url: project.project_url,
      year: project.year, tags: project.tags || [], slug: uniqueSlug(project.title + '-copy'),
      published: false, sort_order: sectionCount
    };
    const { data, error } = await client.from('projects').insert(copy).select().single();
    if (error) return alert(error.message);
    projects.push(data);
    renderLists();
  }

  async function deleteProject(project){
    if (!confirm(`Delete "${project.title}"? This can't be undone.`)) return;
    const { error } = await client.from('projects').delete().eq('id', project.id);
    if (error) return alert(error.message);
    if (project.cover_image) removeFromStorage(project.cover_image);
    (project.images || []).forEach(removeFromStorage);
    projects = projects.filter(p => p.id !== project.id);
    renderLists();
  }

  function uniqueSlug(base){
    let slug = slugify(base);
    const existing = new Set(projects.map(p => p.slug));
    if (!existing.has(slug)) return slug;
    let i = 2;
    while (existing.has(`${slug}-${i}`)) i++;
    return `${slug}-${i}`;
  }

  /* ---------------------------------------------------------
     Add project button
  --------------------------------------------------------- */
  $('#add-project-btn').addEventListener('click', () => openEditor(null));

  /* ---------------------------------------------------------
     Editor modal
  --------------------------------------------------------- */
  function openEditor(project){
    currentEditId = project ? project.id : null;
    editorError.textContent = '';
    editorTitle.textContent = project ? 'Edit Project' : 'Add Project';

    f.title.value = project?.title || '';
    f.section.value = project?.section || 'branding';
    f.year.value = project?.year || '';
    f.category.value = project?.category || '';
    f.description.value = project?.description || '';
    f.url.value = project?.project_url || '';
    f.tags.value = (project?.tags || []).join(', ');
    f.published.checked = project?.published ?? false;

    workingImages = project ? [...(project.images || [])] : [];
    imageSection.hidden = !project;
    imageSaveHint.style.display = project ? 'none' : 'block';
    renderCoverPreview(project?.cover_image || null);
    renderGalleryList();

    overlay.hidden = false;
  }

  function closeEditor(){ overlay.hidden = true; }
  $('#editor-close').addEventListener('click', closeEditor);
  $('#editor-cancel').addEventListener('click', closeEditor);

  editorForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    editorError.textContent = '';

    const payload = {
      title: f.title.value.trim(),
      section: f.section.value,
      year: f.year.value.trim(),
      category: f.category.value.trim(),
      description: f.description.value.trim(),
      project_url: f.url.value.trim() || null,
      tags: f.tags.value.split(',').map(t => t.trim()).filter(Boolean),
      published: f.published.checked
    };
    if (!payload.title) { editorError.textContent = 'Title is required.'; return; }

    if (currentEditId) {
      const { error } = await client.from('projects').update(payload).eq('id', currentEditId);
      if (error) return (editorError.textContent = error.message);
      Object.assign(projects.find(p => p.id === currentEditId), payload);
      renderLists();
      closeEditor();
    } else {
      payload.slug = uniqueSlug(payload.title);
      payload.images = [];
      payload.sort_order = projects.filter(p => p.section === payload.section).length;
      const { data, error } = await client.from('projects').insert(payload).select().single();
      if (error) return (editorError.textContent = error.message);
      projects.push(data);
      renderLists();
      // Switch straight into edit mode so images can be added.
      currentEditId = data.id;
      editorTitle.textContent = 'Edit Project';
      imageSection.hidden = false;
      imageSaveHint.style.display = 'none';
    }
  });

  /* ---------------------------------------------------------
     Cover image
  --------------------------------------------------------- */
  function renderCoverPreview(url){
    coverPreview.innerHTML = url ? `<img src="${url}" alt="">` : '';
  }

  coverInput.addEventListener('change', async () => {
    const file = coverInput.files[0];
    if (!file || !currentEditId) return;
    const path = `${currentEditId}/cover-${Date.now()}-${file.name}`;
    const { error: upErr } = await client.storage.from(BUCKET).upload(path, file, { upsert: true });
    if (upErr) { editorError.textContent = upErr.message; return; }
    const { data } = client.storage.from(BUCKET).getPublicUrl(path);
    const url = data.publicUrl;
    const { error } = await client.from('projects').update({ cover_image: url }).eq('id', currentEditId);
    if (error) { editorError.textContent = error.message; return; }
    const p = projects.find(x => x.id === currentEditId);
    if (p) p.cover_image = url;
    renderCoverPreview(url);
    coverInput.value = '';
  });

  /* ---------------------------------------------------------
     Gallery images (dynamic count, drag to reorder)
  --------------------------------------------------------- */
  function renderGalleryList(){
    galleryList.innerHTML = '';
    workingImages.forEach((url, index) => {
      const li = document.createElement('li');
      li.className = 'admin-gallery-item';
      li.draggable = true;
      li.dataset.index = String(index);
      li.innerHTML = `<img src="${url}" alt=""><button type="button" aria-label="Remove image">×</button>`;
      li.querySelector('button').addEventListener('click', () => removeGalleryImage(index));
      addGalleryDragHandlers(li);
      galleryList.appendChild(li);
    });
  }

  function addGalleryDragHandlers(li){
    li.addEventListener('dragstart', () => li.classList.add('is-dragging'));
    li.addEventListener('dragend', () => {
      li.classList.remove('is-dragging');
      const newOrder = Array.from(galleryList.children).map(el => workingImages[Number(el.dataset.index)]);
      workingImages = newOrder;
      persistGallery();
      renderGalleryList();
    });
    li.addEventListener('dragover', (e) => {
      e.preventDefault();
      const dragging = galleryList.querySelector('.is-dragging');
      if (!dragging || dragging === li) return;
      const rect = li.getBoundingClientRect();
      const before = (e.clientX - rect.left) < rect.width / 2;
      galleryList.insertBefore(dragging, before ? li : li.nextSibling);
    });
  }

  async function persistGallery(){
    if (!currentEditId) return;
    const { error } = await client.from('projects').update({ images: workingImages }).eq('id', currentEditId);
    if (error) editorError.textContent = error.message;
    const p = projects.find(x => x.id === currentEditId);
    if (p) p.images = workingImages;
  }

  async function removeGalleryImage(index){
    const [removed] = workingImages.splice(index, 1);
    if (removed) removeFromStorage(removed);
    await persistGallery();
    renderGalleryList();
  }

  galleryInput.addEventListener('change', async () => {
    const files = Array.from(galleryInput.files || []);
    if (!files.length || !currentEditId) return;
    for (const [i, file] of files.entries()) {
      const path = `${currentEditId}/gallery-${Date.now()}-${i}-${file.name}`;
      const { error: upErr } = await client.storage.from(BUCKET).upload(path, file, { upsert: true });
      if (upErr) { editorError.textContent = upErr.message; continue; }
      const { data } = client.storage.from(BUCKET).getPublicUrl(path);
      workingImages.push(data.publicUrl);
    }
    await persistGallery();
    renderGalleryList();
    galleryInput.value = '';
  });

  boot();
})();
