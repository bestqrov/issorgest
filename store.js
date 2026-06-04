// ─── Employees ───────────────────────────────

export async function getEmployees() {
  const res = await fetch('/api/employees');
  if (!res.ok) throw new Error('Erreur chargement employés');
  return res.json();
}

export async function saveEmployee(emp) {
  const isNew = !emp._id && !emp.id?.startsWith('emp_');
  const url   = isNew ? '/api/employees' : `/api/employees/${emp._id || emp.id}`;
  const method = isNew ? 'POST' : 'PUT';

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(emp),
  });
  if (!res.ok) throw new Error('Erreur sauvegarde employé');
  return getEmployees();
}

export async function deleteEmployee(id) {
  const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Erreur suppression employé');
  return getEmployees();
}

// ─── Bulletins ───────────────────────────────

export async function getBulletins() {
  const res = await fetch('/api/bulletins');
  if (!res.ok) throw new Error('Erreur chargement bulletins');
  return res.json();
}

export async function saveBulletin(bulletin) {
  const res = await fetch('/api/bulletins', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bulletin),
  });
  if (!res.ok) throw new Error('Erreur sauvegarde bulletin');
  return getBulletins();
}

export async function deleteBulletin(id) {
  const res = await fetch(`/api/bulletins/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Erreur suppression bulletin');
  return getBulletins();
}

export async function updateBulletinEtat(id, etat) {
  const res = await fetch(`/api/bulletins/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ etat }),
  });
  if (!res.ok) throw new Error('Erreur mise à jour état');
  return getBulletins();
}

// ─── Charges ─────────────────────────────────

export async function getCharges() {
  const res = await fetch('/api/charges');
  if (!res.ok) throw new Error('Erreur chargement charges');
  return res.json();
}

export async function saveCharge(charge) {
  const isNew = !charge._id;
  const url    = isNew ? '/api/charges' : `/api/charges/${charge._id || charge.id}`;
  const res = await fetch(url, {
    method: isNew ? 'POST' : 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(charge),
  });
  if (!res.ok) throw new Error('Erreur sauvegarde charge');
  return getCharges();
}

export async function deleteCharge(id) {
  const res = await fetch(`/api/charges/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Erreur suppression charge');
  return getCharges();
}

// ─── Recettes ────────────────────────────────

export async function getRecettes() {
  const res = await fetch('/api/recettes');
  if (!res.ok) throw new Error('Erreur chargement recettes');
  return res.json();
}

export async function saveRecette(recette) {
  const isNew = !recette._id;
  const url    = isNew ? '/api/recettes' : `/api/recettes/${recette._id || recette.id}`;
  const res = await fetch(url, {
    method: isNew ? 'POST' : 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(recette),
  });
  if (!res.ok) throw new Error('Erreur sauvegarde recette');
  return getRecettes();
}

export async function deleteRecette(id) {
  const res = await fetch(`/api/recettes/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Erreur suppression recette');
  return getRecettes();
}

// ─── Pointage ────────────────────────────────

export async function getPointage(mois) {
  const url = mois ? `/api/pointage?mois=${encodeURIComponent(mois)}` : '/api/pointage';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Erreur chargement pointage');
  return res.json();
}

export async function savePointage(pointage) {
  const docId = pointage._id || pointage.id;
  const isNew = !docId || docId === 'null' || docId === null;
  const url   = isNew ? '/api/pointage' : `/api/pointage/${docId}`;

  // Ne jamais envoyer _id null au serveur
  const { _id, id, __v, ...clean } = pointage;
  const payload = {
    ...clean,
    employeeId: String(pointage.employeeId || ''),
  };

  const res = await fetch(url, {
    method: isNew ? 'POST' : 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Erreur sauvegarde pointage');
  }
  return res.json();
}

export async function deletePointage(id) {
  const res = await fetch(`/api/pointage/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Erreur suppression pointage');
}

// ─── Contrats ─────────────────────────────────

export async function getContrats(employeeId) {
  const url = employeeId ? `/api/contrats?employeeId=${employeeId}` : '/api/contrats';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Erreur chargement contrats');
  return res.json();
}

export async function saveContrat(contrat) {
  const isNew = !contrat._id && !contrat.id;
  const url   = isNew ? '/api/contrats' : `/api/contrats/${contrat._id || contrat.id}`;
  const res = await fetch(url, {
    method: isNew ? 'POST' : 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contrat),
  });
  if (!res.ok) throw new Error('Erreur sauvegarde contrat');
  return getContrats();
}

export async function updateContrat(id, data) {
  const res = await fetch(`/api/contrats/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Erreur mise à jour contrat');
  return getContrats();
}

export async function deleteContrat(id) {
  const res = await fetch(`/api/contrats/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Erreur suppression contrat');
  return getContrats();
}
