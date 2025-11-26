/* ---------- Config & State ---------- */
const KEY = 'ev_dual_tickets_v1';
const CHANNEL = 'ev_dual_channel';

// BroadcastChannel
let bc = ('BroadcastChannel' in window) ? new BroadcastChannel(CHANNEL) : null;
if (bc) bc.onmessage = (m) => { if (m.data && m.data.type === 'sync') renderMyTickets(); };
window.addEventListener('storage', (e)=> { if (e.key==='ev_dual_sync_ts') renderMyTickets(); });

/* ---------- Utils ---------- */
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
function uid(){ return 'TKT-' + Math.floor(Math.random()*90000+10000); }
function now(){ return new Date().toISOString(); }
function fmtDate(iso){ return new Date(iso).toLocaleString(); }

function loadTickets(){ try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch(e){ return []; } }
function saveTickets(data){ localStorage.setItem(KEY, JSON.stringify(data)); broadcast(); }
function broadcast(){ if (bc) bc.postMessage({type:'sync'}); else localStorage.setItem('ev_dual_sync_ts', Date.now()); }

/* ---------- Elements ---------- */
const CURRENT_USER = "member:leo";
const searchInput = $("#searchInput");
const btnCreate = $("#btnCreate");
const myTickets = $("#myTickets");

// Modals
const createModal = $("#createModal");
const detailModal = $("#detailModal");
const createForm = $("#createForm");
const attachmentInput = $("#attachmentInput");
const attachmentPreview = $("#attachmentPreview");

// Detail Elements
const detailTitle = $("#detailTitle");
const detailMeta = $("#detailMeta");
const detailDesc = $("#detailDesc");
const detailAttachments = $("#detailAttachments");
const commentsList = $("#commentsList");
const commentForm = $("#commentForm");
const commentInput = $("#commentInput");
const detailBlocked = $("#detailBlocked");
const btnDeleteTicket = $("#btnDeleteTicket");

let tickets = loadTickets();
let selectedTicketId = null;

/* ---------- Render ---------- */
function statusBadge(s){
  let cls = "pill ";
  if (s==='New') cls += "new";
  else if (s==='In Progress' || s==='Progress') cls += "progress";
  else if (s==='Resolved' || s==='Closed' || s==='Done') cls += "done";
  else cls += "ghost"; // fallback
  
  // Map status text if needed
  const text = s === 'Progress' ? 'In Progress' : s;
  return `<span class="${cls}">${text}</span>`;
}

function renderMyTickets(){
  tickets = loadTickets();
  myTickets.innerHTML = '';
  const owner = CURRENT_USER;
  const q = (searchInput.value || '').toLowerCase();
  
  // Filter: Owner matches AND (Search matches Title or ID)
  const mine = tickets.filter(t => t.owner_id === owner);
  
  if(mine.length === 0) {
    myTickets.innerHTML = `<div style="text-align:center; padding:40px; color:var(--muted)">No tickets found.</div>`;
    return;
  }

  mine.forEach(t => {
    if (q && !(t.title.toLowerCase().includes(q) || t.ticket_id.toLowerCase().includes(q))) return;
    
    const card = document.createElement('div');
    card.className = 'ticket-card';
    card.innerHTML = `
      <div class="ticket-main">
        <div class="ticket-header">
          <span>${t.ticket_id}</span>
          <span>${t.title}</span>
          ${t.anonymous ? '<span class="pill" style="background:#eee; color:#666; font-size:10px;">Anon</span>' : ''}
        </div>
        <div class="ticket-meta">
          ${t.category} • ${t.priority} • ${fmtDate(t.created_at)}
        </div>
        <div class="ticket-desc">${t.description}</div>
      </div>
      <div class="ticket-side">
        ${statusBadge(t.status)}
        <button class="btn ghost" style="height:32px; font-size:12px; padding:0 10px;" data-id="${t.ticket_id}">Open</button>
      </div>
    `;
    
    // Add click event to the Open button
    const btn = card.querySelector('button');
    btn.addEventListener('click', () => openDetail(t.ticket_id));
    
    myTickets.appendChild(card);
  });
}

/* ---------- Actions ---------- */
function openModal(el){ el.classList.add("show"); }
function closeModal(el){ el.classList.remove("show"); }

// Close buttons
$$(".close-modal").forEach(btn => {
  btn.addEventListener("click", (e) => {
    e.preventDefault(); // prevent form submit if inside form
    const targetId = btn.dataset.target;
    closeModal($("#"+targetId));
  });
});

// Create Ticket
btnCreate.addEventListener("click", () => {
  createForm.reset();
  attachmentPreview.innerHTML = "";
  openModal(createModal);
});

// Attachment Preview
attachmentInput.addEventListener("change", () => {
  attachmentPreview.innerHTML = "";
  const f = attachmentInput.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = (e) => {
    if (f.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.className = 'attachment-thumb';
      attachmentPreview.appendChild(img);
    } else {
      const p = document.createElement('div');
      p.style.fontSize = "12px";
      p.textContent = f.name;
      attachmentPreview.appendChild(p);
    }
  };
  r.readAsDataURL(f);
});

// Submit Create
$("#submitTicket").addEventListener("click", (e) => {
  e.preventDefault();
  // Manual validation
  const title = createForm.title.value.trim();
  const desc = createForm.description.value.trim();
  if(!title || !desc) return alert("Please fill in Title and Description");

  const fd = new FormData(createForm);
  const f = attachmentInput.files[0];
  const attachments = [];
  
  if (f) {
    const r = new FileReader();
    r.onload = (ev)=> { 
      attachments.push({name:f.name, data:ev.target.result}); 
      finalizeCreate(fd, attachments); 
    };
    r.readAsDataURL(f);
  } else {
    finalizeCreate(fd, attachments);
  }
});

function finalizeCreate(fd, attachments){
  const owner = CURRENT_USER;
  const t = {
    ticket_id: uid(),
    title: fd.get('title'),
    description: fd.get('description'),
    category: fd.get('category'),
    priority: fd.get('priority') || 'Medium',
    status: 'New',
    assignee: 'Unassigned',
    created_at: now(),
    updated_at: now(),
    anonymous: fd.get('anonymous') === 'on', // Checkbox
    attachments,
    comments: [],
    owner_id: owner,
    blocked_reason: null,
    internal_notes: ''
  };
  
  tickets = loadTickets();
  tickets.unshift(t);
  saveTickets(tickets);
  closeModal(createModal);
  renderMyTickets();
}

// Open Detail
function openDetail(id){
  tickets = loadTickets();
  const t = tickets.find(x => x.ticket_id === id);
  if (!t) return alert('Ticket not found');
  
  selectedTicketId = id;
  detailTitle.textContent = `${t.ticket_id} — ${t.title}`;
  detailMeta.innerHTML = `Category: <strong>${t.category}</strong> • Created: ${fmtDate(t.created_at)}`;
  detailDesc.textContent = t.description;
  
  // Attachments
  detailAttachments.innerHTML = '';
  t.attachments.forEach(a => {
    if (a.data && a.data.startsWith('data:image')) {
      const img = document.createElement('img'); 
      img.src = a.data; 
      img.className='attachment-thumb'; 
      detailAttachments.appendChild(img);
    } else {
      const ael = document.createElement('a'); 
      ael.href = a.data; 
      ael.target='_blank'; 
      ael.textContent = a.name;
      ael.style.fontSize = "13px";
      detailAttachments.appendChild(ael);
    }
  });
  
  // Comments
  commentsList.innerHTML = '';
  t.comments.forEach(c => {
    const li = document.createElement('li'); 
    li.className='comment-item';
    li.innerHTML = `<div class="comment-meta">${c.author} • ${fmtDate(c.created_at)}</div><div class="comment-text">${c.text}</div>`;
    commentsList.appendChild(li);
  });
  
  detailBlocked.textContent = t.blocked_reason || '-';
  openModal(detailModal);
}

// Submit Comment
commentForm.addEventListener('submit', e => {
  e.preventDefault();
  const text = commentInput.value.trim();
  if (!text) return;
  
  tickets = loadTickets();
  const t = tickets.find(x => x.ticket_id === selectedTicketId);
  if (!t) return;
  
  const author = t.anonymous ? 'Anonymous' : CURRENT_USER;
  t.comments.push({ author, text, created_at: now() });
  t.updated_at = now();
  saveTickets(tickets);
  
  commentInput.value = '';
  openDetail(selectedTicketId); // Refresh detail view
  renderMyTickets(); // Refresh list (if needed)
});

// Delete Ticket
btnDeleteTicket.addEventListener("click", () => {
  if(!selectedTicketId) return;
  if(confirm("Are you sure you want to delete this ticket? This action cannot be undone.")){
    tickets = loadTickets();
    tickets = tickets.filter(t => t.ticket_id !== selectedTicketId);
    saveTickets(tickets);
    closeModal(detailModal);
    renderMyTickets();
  }
});

/* ---------- Events ---------- */
searchInput.addEventListener('input', renderMyTickets);

// Initial Render
renderMyTickets();