'use strict';

const $ = id => document.getElementById(id);
const apiBaseUrl = (window.SECURE_NOTES_API_BASE_URL || '/api').replace(/\/$/, '');
const state = {
  user: null, accessToken: null, view: 'posts', register: false, limit: 10,
  pages: { notes: 1, posts: 1, lookup: 1, users: 1, allNotes: 1, interests: 1 },
  lookupUsername: '', owner: '', interest: '', loadVersion: 0,
};
const fields = form => form.elements;
const parseInterests = value => value.split(',').map(item => item.trim()).filter(Boolean);
const date = value => new Date(value).toLocaleString();

function notice(message, isError = false) {
  $('notice').textContent = message;
  $('notice').classList.toggle('error', isError);
  $('notice').setAttribute('role', isError ? 'alert' : 'status');
  $('notice').hidden = !message;
}

async function api(path, { method = 'GET', body, ignoreSession = false } = {}) {
  const headers = { Accept: 'application/json' };
  if (state.accessToken && !ignoreSession) headers.Authorization = `Bearer ${state.accessToken}`;
  if (method !== 'GET') headers['X-CSRF-Protection'] = '1';
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const url = new URL(`${apiBaseUrl}${path}`, window.location.href);
  const response = await fetch(url, {
    method, headers, credentials: url.origin === window.location.origin ? 'same-origin' : 'omit',
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (response.status === 204) return null;
  const payload = await response.json();
  if (!response.ok) {
    if (response.status === 401 && state.user && !ignoreSession) {
      setUser(null);
      void switchView('posts');
    }
    const detail = payload.error?.details?.map(item => `${item.field}: ${item.message}`).join('; ');
    const error = new Error(detail || payload.error?.message || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

function setUser(user, accessToken = state.accessToken) {
  state.user = user;
  state.accessToken = user ? accessToken : null;
  state.loadVersion += 1;
  $('auth-section').hidden = Boolean(user);
  $('logout').hidden = !user;
  $('session-label').textContent = user ? `${user.name} (@${user.username}) · ${user.role}` : 'Not signed in';
  document.querySelectorAll('[data-auth]').forEach(node => { node.hidden = !user; });
  document.querySelectorAll('[data-admin]').forEach(node => { node.hidden = user?.role !== 'admin'; });
  if (user) {
    $('account-details').textContent = `${user.email} · @${user.username}`;
    fields($('profile-form')).name.value = user.name;
    fields($('profile-form')).username.value = user.username;
    fields($('profile-form')).interests.value = user.interests.join(', ');
  } else {
    // Clear private DOM data on logout/session expiry, including hidden panels.
    for (const view of ['notes', 'users', 'allNotes', 'interests']) {
      $(`${view}-list`).replaceChildren();
      $(`${view}-pagination`).replaceChildren();
    }
    $('account-details').textContent = '';
    $('profile-form').reset();
    $('password-form').reset();
    $('record-dialog').close();
    for (const id of ['record-title', 'record-meta', 'record-content']) $(id).textContent = '';
    resetEditor('note'); resetEditor('post'); resetUserEditor();
  }
}

function setAuthMode(register) {
  state.register = register;
  for (const id of ['register-name', 'register-username', 'register-interests', 'password-help']) $(id).hidden = !register;
  const form = $('auth-form');
  fields(form).name.disabled = !register; fields(form).name.required = register;
  fields(form).username.disabled = !register; fields(form).username.required = register;
  fields(form).interests.disabled = !register;
  fields(form).email.type = register ? 'email' : 'text';
  fields(form).password.minLength = register ? 6 : 1;
  fields(form).password.autocomplete = register ? 'new-password' : 'current-password';
  $('auth-identity-label').childNodes[0].textContent = register ? 'Email' : 'Email or username';
  $('auth-title').textContent = register ? 'Create an account' : 'Sign in';
  $('auth-submit').textContent = register ? 'Create account' : 'Sign in';
  $('toggle-auth').textContent = register ? 'I already have an account' : 'Create an account';
}

function action(label, callback, className = 'secondary') {
  const button = document.createElement('button');
  button.type = 'button'; button.textContent = label; button.className = className;
  button.addEventListener('click', async () => {
    button.disabled = true;
    try { await callback(); } catch (error) { notice(error.message, true); }
    finally { button.disabled = false; }
  });
  return button;
}

function card(title, content, metadata, buttons = []) {
  const article = document.createElement('article'); article.className = 'card';
  const heading = document.createElement('h3'); heading.textContent = title;
  const meta = document.createElement('p'); meta.className = 'meta'; meta.textContent = metadata;
  const body = document.createElement('p'); body.className = 'record-body'; body.textContent = content;
  const actions = document.createElement('div'); actions.className = 'actions'; actions.append(...buttons);
  article.append(heading, meta, body, actions);
  return article;
}

function renderList(view, records, makeCard) {
  const list = $(`${view}-list`);
  list.replaceChildren(...records.map(makeCard));
  if (!records.length) {
    const empty = document.createElement('p'); empty.textContent = 'No results on this page.'; list.append(empty);
  }
}

function renderPagination(view, pagination) {
  const label = document.createElement('span');
  label.textContent = `Page ${pagination.page} of ${pagination.totalPages || 1} · ${pagination.total} total`;
  const previous = action('Previous', async () => { state.pages[view] -= 1; await loadView(); });
  const next = action('Next', async () => { state.pages[view] += 1; await loadView(); });
  previous.disabled = !pagination.hasPreviousPage;
  next.disabled = !pagination.hasNextPage;
  $(`${view}-pagination`).replaceChildren(previous, label, next);
}

async function readRecord(kind, id) {
  const userId = state.user?._id;
  const response = await api(`/${kind}s/${id}`);
  if (kind === 'note' && state.user?._id !== userId) return;
  const item = response.data[kind];
  const owner = kind === 'note' ? item.owner : item.author;
  const label = kind === 'note' ? 'Owner' : 'Author';
  $('record-title').textContent = item.title;
  $('record-meta').textContent = `${label}: @${owner?.username || 'unknown'} · Updated ${date(item.updatedAt)}`;
  $('record-content').textContent = item.content;
  $('record-dialog').showModal();
}

function resetEditor(kind) {
  const form = $(`${kind}-form`); form.reset(); fields(form).id.value = '';
  $(`${kind}-form-title`).textContent = kind === 'note' ? 'Create a note' : 'Write a public post';
  $(`cancel-${kind}`).hidden = true;
}

async function editRecord(kind, id) {
  const userId = state.user?._id;
  const response = await api(`/${kind}s/${id}`);
  if (!state.user || state.user._id !== userId) return;
  const item = response.data[kind];
  if (state.view !== `${kind}s`) await switchView(`${kind}s`);
  const form = $(`${kind}-form`);
  for (const key of ['id', 'title', 'content']) fields(form)[key].value = key === 'id' ? item._id : item[key];
  $(`${kind}-form-title`).textContent = `Edit ${kind}`;
  $(`cancel-${kind}`).hidden = false; fields(form).title.focus();
}

async function removeRecord(kind, id) {
  if (!window.confirm(`Delete this ${kind}? This cannot be undone.`)) return;
  await api(`/${kind}s/${id}`, { method: 'DELETE' });
  if (fields($(`${kind}-form`)).id.value === id) resetEditor(kind);
  notice(`${kind === 'note' ? 'Note' : 'Post'} deleted.`);
  await loadView(true);
}

function recordCard(kind, item, readOnly = false) {
  const owner = kind === 'note' ? item.owner : item.author;
  const ownerId = owner?._id || owner;
  const ownerUsername = owner?.username || 'unknown';
  const buttons = [action('Read', () => readRecord(kind, item._id))];
  if (kind === 'post') buttons.push(action('View author posts', async () => {
    state.lookupUsername = ownerUsername; fields($('lookup-form')).username.value = ownerUsername;
    state.pages.lookup = 1; await switchView('lookup');
  }));
  if (!readOnly && state.user?._id === ownerId) {
    buttons.push(action('Edit', () => editRecord(kind, item._id)), action('Delete', () => removeRecord(kind, item._id), 'danger'));
  }
  return card(item.title, item.content, `${kind === 'note' ? 'Owner' : 'Author'}: @${ownerUsername} · Updated ${date(item.updatedAt)}`, buttons);
}

function resetUserEditor() {
  const form = $('user-form'); form.reset(); fields(form).id.value = '';
  fields(form).password.required = true;
  $('user-active-label').hidden = true; $('cancel-user').hidden = true;
  $('user-form-title').textContent = 'Add a user';
}

async function editUser(id) {
  const userId = state.user?._id;
  const { data: { user } } = await api(`/admin/users/${id}`);
  if (!state.user || state.user._id !== userId || state.user.role !== 'admin') return;
  const form = $('user-form'); form.reset();
  for (const key of ['name', 'username', 'email', 'role']) fields(form)[key].value = user[key];
  fields(form).id.value = user._id; fields(form).interests.value = user.interests.join(', ');
  fields(form).isActive.checked = user.isActive; fields(form).password.required = false;
  $('user-active-label').hidden = false; $('cancel-user').hidden = false;
  $('user-form-title').textContent = `Edit ${user.name}`; fields(form).name.focus();
}

function userCard(user) {
  const buttons = [action('View / edit', () => editUser(user._id)), action('View posts', async () => {
    state.lookupUsername = user.username; fields($('lookup-form')).username.value = user.username;
    state.pages.lookup = 1; await switchView('lookup');
  })];
  if (user._id !== state.user._id) buttons.push(action('Delete user', async () => {
    if (!window.confirm(`Delete ${user.name}, all their notes, and all their posts? This cannot be undone.`)) return;
    await api(`/admin/users/${user._id}`, { method: 'DELETE' });
    if (fields($('user-form')).id.value === user._id) resetUserEditor();
    notice('User and their content deleted.'); await loadView(true);
  }, 'danger'));
  return card(user.name, `${user.email}\nInterests: ${user.interests.join(', ') || 'None'}`,
    `@${user.username} · ${user.role} · ${user.isActive ? 'Active' : 'Inactive'}`, buttons);
}

async function loadView(afterDelete = false) {
  const view = state.view;
  const loadVersion = ++state.loadVersion;
  if (view === 'account' || (view === 'lookup' && !state.lookupUsername)) return;
  const query = new URLSearchParams({ page: state.pages[view], limit: state.limit });
  let path;
  if (view === 'notes') path = '/notes';
  if (view === 'posts') path = '/posts';
  if (view === 'lookup') path = `/users/${encodeURIComponent(state.lookupUsername)}/posts`;
  if (view === 'users') path = '/admin/users';
  if (view === 'allNotes') { path = '/admin/notes'; if (state.owner) query.set('owner', state.owner); }
  if (view === 'interests') { path = '/admin/analytics/interests'; if (state.interest) query.set('interest', state.interest); }
  const result = await api(`${path}?${query}`);
  // Ignore stale responses after a tab switch, another load, or logout.
  if (loadVersion !== state.loadVersion || state.view !== view) return;
  if (afterDelete && !result.data.length && state.pages[view] > 1) {
    state.pages[view] = Math.max(1, result.pagination.totalPages); return loadView();
  }
  if (view === 'lookup') $('lookup-summary').textContent = `${result.user.name} · ${result.pagination.total} public posts`;
  renderList(view, result.data, item => {
    if (view === 'users') return userCard(item);
    if (view === 'interests') return card(item.interest, `${item.userCount} users`, '');
    return recordCard(['posts', 'lookup'].includes(view) ? 'post' : 'note', item, view === 'allNotes');
  });
  renderPagination(view, result.pagination);
}

async function switchView(view) {
  if (['notes', 'account'].includes(view) && !state.user) view = 'posts';
  if (['users', 'allNotes', 'interests'].includes(view) && state.user?.role !== 'admin') view = 'posts';
  state.view = view;
  document.querySelectorAll('.panel').forEach(panel => { panel.hidden = panel.id !== `${view}-panel`; });
  document.querySelectorAll('[data-view]').forEach(button => {
    if (button.dataset.view === view) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  try { await loadView(); } catch (error) { notice(error.message, true); }
}

function onSubmit(id, handler) {
  const form = $(id);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (form.dataset.busy) return;
    form.dataset.busy = 'true';
    const submit = form.querySelector('button[type="submit"]'); submit.disabled = true;
    try { await handler(new FormData(form), form); } catch (error) { notice(error.message, true); }
    finally { delete form.dataset.busy; submit.disabled = false; }
  });
}

onSubmit('auth-form', async (data, form) => {
  const identity = data.get('email').trim();
  const body = identity.includes('@') ? { email: identity, password: data.get('password') }
    : { username: identity, password: data.get('password') };
  if (state.register) {
    body.name = data.get('name'); body.username = data.get('username'); body.interests = parseInterests(data.get('interests'));
  }
  const result = await api(`/auth/${state.register ? 'register' : 'login'}`, { method: 'POST', body, ignoreSession: true });
  if (state.register) setAuthMode(false);
  setUser(result.data.user, result.data.accessToken); form.reset(); resetEditor('note'); resetEditor('post');
  Object.keys(state.pages).forEach(key => { state.pages[key] = 1; });
  notice('Signed in.'); await switchView('notes');
});

$('toggle-auth').addEventListener('click', () => {
  setAuthMode(!state.register);
});

for (const kind of ['note', 'post']) {
  onSubmit(`${kind}-form`, async (data, form) => {
    const id = data.get('id');
    await api(`/${kind}s${id ? `/${id}` : ''}`, {
      method: id ? 'PATCH' : 'POST', body: { title: data.get('title'), content: data.get('content') },
    });
    resetEditor(kind); state.pages[`${kind}s`] = 1;
    notice(`${kind === 'note' ? 'Note' : 'Post'} saved.`); await loadView();
  });
  $(`cancel-${kind}`).addEventListener('click', () => resetEditor(kind));
}

onSubmit('lookup-form', async data => {
  state.lookupUsername = data.get('username').trim().toLowerCase(); state.pages.lookup = 1; await loadView();
});
onSubmit('owner-form', async data => {
  state.owner = data.get('owner').trim(); state.pages.allNotes = 1; await loadView();
});
onSubmit('interest-form', async data => {
  state.interest = data.get('interest').trim(); state.pages.interests = 1; await loadView();
});
onSubmit('profile-form', async data => {
  const result = await api('/auth/me', { method: 'PATCH', body: {
    name: data.get('name'), username: data.get('username'), interests: parseInterests(data.get('interests')),
  } });
  setUser(result.data.user); notice('Profile updated.');
});
onSubmit('password-form', async (data, form) => {
  const result = await api('/auth/password', { method: 'PATCH', body: Object.fromEntries(data) });
  setUser(result.data.user, result.data.accessToken); form.reset(); notice('Password changed. Your other sessions have been signed out.');
});
onSubmit('user-form', async (data, form) => {
  const id = data.get('id');
  const body = {
    name: data.get('name'), username: data.get('username'), email: data.get('email'), role: data.get('role'), interests: parseInterests(data.get('interests')),
  };
  if (data.get('password')) body.password = data.get('password');
  if (id) body.isActive = fields(form).isActive.checked;
  const result = await api(`/admin/users${id ? `/${id}` : ''}`, { method: id ? 'PATCH' : 'POST', body });
  if (result.data.user._id === state.user._id) setUser(result.data.user, result.data.accessToken);
  resetUserEditor(); state.pages.users = 1; notice('User saved.'); await loadView();
});

$('cancel-user').addEventListener('click', resetUserEditor);
$('logout').addEventListener('click', async () => {
  $('logout').disabled = true;
  try {
    await api('/auth/logout', { method: 'POST', body: {} });
    setUser(null); notice('Signed out of all sessions.'); await switchView('posts');
  } catch (error) { notice(error.message, true); }
  finally { $('logout').disabled = false; }
});
$('close-dialog').addEventListener('click', () => $('record-dialog').close());
$('refresh').addEventListener('click', () => { void loadView().catch(error => notice(error.message, true)); });
$('page-size').addEventListener('change', () => {
  state.limit = Number($('page-size').value);
  Object.keys(state.pages).forEach(key => { state.pages[key] = 1; });
  void loadView().catch(error => notice(error.message, true));
});
document.querySelectorAll('[data-view]').forEach(button => {
  button.addEventListener('click', () => { void switchView(button.dataset.view); });
});

(async () => {
  try { setUser((await api('/auth/me')).data.user); }
  catch (error) { if (error.status !== 401) notice(error.message, true); }
  await switchView(state.user ? 'notes' : 'posts');
})();
