/* ---------- Dummy data (inspired by your first screenshot) ---------- */
const TICKETS = [
  ["TKT-001","Bos saya marah-marah mulu kerjannya","New","Low","Sarah Chen","2025-01-15T10:30:00+07:00"],
  ["TKT-002","Teman saya malas malasan saat jam kerja","Progress","Medium","John Doe","2025-01-15T11:45:00+07:00"],
  ["TKT-003","AC ruangan tidak dingin sama sekali","New","Low","Sarah Chen","2025-01-15T14:15:00+07:00"],
  ["TKT-004","Gaji bulan ini belum masuk ke rekening","New","High","Anonymous","2025-01-16T09:00:00+07:00"],
  ["TKT-005","Komputer saya sering hang dan lambat","Progress","Medium","Mike Johnson","2025-01-16T10:20:00+07:00"],
  ["TKT-006","Toilet lantai 3 kotor dan bau","Done","Low","Jane Smith","2025-01-16T11:30:00+07:00"],
  ["TKT-007","Atasan saya tidak pernah approve cuti","New","High","John Doe","2025-01-17T08:45:00+07:00"],
  ["TKT-008","Minta tambahan monitor untuk kerja","Progress","Medium","Sarah Chen","2025-01-17T13:00:00+07:00"],
  ["TKT-009","Parkiran motor selalu penuh pagi hari","New","Low","Anonymous","2025-01-17T13:00:00+07:00"],
  ["TKT-010","Rekan kerja suka gossip dan fitnah","New","High","Anonymous","2025-01-17T15:30:00+07:00"],
  ["TKT-011","Internet kantor lemot banget","Progress","High","Anonymous","2025-01-18T09:15:00+07:00"],
  ["TKT-012","Meja kerja saya goyang dan patah","New","Medium","Mike Johnson","2025-01-18T10:45:00+07:00"],
  ["TKT-013","Kantin tidak ada menu vegetarian","Done","Low","Sarah Chen","2025-01-18T14:00:00+07:00"],
  ["TKT-014","Overtime tidak dibayar sesuai aturan","New","High","Jane Smith","2025-01-19T11:00:00+07:00"],
  ["TKT-015","Ruang meeting selalu penuh dipesan","Progress","Medium","John Doe","2025-01-19T13:30:00+07:00"],
  ["TKT-016","Printer rusak sudah seminggu ini","New","Low","Anonymous","2025-01-19T15:45:00+07:00"],
  ["TKT-017","Manager baru tidak menghargai tim","New","High","Mike Johnson","2025-01-20T08:30:00+07:00"]
];

// Normalize to objects
const seed = TICKETS.map(([id,title,status,priority,assignee,createdAt]) => ({
  id, title, status, priority,
  assignee: assignee === "Anonymous" ? null : { name: assignee },
  createdAt, description: ""
}));

const state = {
  tickets: JSON.parse(localStorage.getItem("ev_tickets") || "null") || seed,
  filters: JSON.parse(localStorage.getItem("ev_filters") || "null") || {
    status: "All", priority: "All", assignee: "All", search: ""
  },
  sort: JSON.parse(localStorage.getItem("ev_sort") || "null") || { key:"createdAt", dir:"desc" },
  editingId: null
};
const $ = s => document.querySelector(s);
const tbody = $("#tbody");

function persist(){
  localStorage.setItem("ev_tickets", JSON.stringify(state.tickets));
  localStorage.setItem("ev_filters", JSON.stringify(state.filters));
  localStorage.setItem("ev_sort", JSON.stringify(state.sort));
}

/* ---------- Helpers ---------- */
const priorityRank = p => ({High:3,Medium:2,Low:1}[p]||0);
const statusRank   = s => ({New:1,Progress:2,Done:3}[s]||0);
function initials(name){ return (name||"").split(/\s+/).map(s=>s[0]).join("").slice(0,2).toUpperCase(); }
function fmtDate(iso){
  const d=new Date(iso); const t=new Date();
  const dt=new Date(t.getFullYear(),t.getMonth(),t.getDate());
  const dd=new Date(d.getFullYear(),d.getMonth(),d.getDate());
  if(+dt===+dd) return "Jan 15, 10:30 AM".replace(/.*/, "Today"); // compact “Today” like screenshot
  const opts={month:"short", day:"2-digit", hour:"2-digit", minute:"2-digit"};
  return d.toLocaleString(undefined,opts);
}

/* ---------- Filters & Sort ---------- */
function buildAssigneeOptions(){
  const set = new Set(state.tickets.map(t=>t.assignee?.name || "Anonymous"));
  const select = $("#filterAssignee");
  const current = state.filters.assignee;
  select.innerHTML = `<option value="All">All Assignee</option>` +
    [...set].sort().map(n=>`<option value="${n}">${n}</option>`).join("");
  select.value = current;
}
function applyFilters(list){
  const f=state.filters; const s=f.search.trim().toLowerCase();
  return list.filter(t=>{
    if(f.status!=="All" && t.status!==f.status) return false;
    if(f.priority!=="All" && t.priority!==f.priority) return false;
    if(f.assignee!=="All"){
      const name = t.assignee?.name || "Anonymous";
      if(name!==f.assignee) return false;
    }
    if(s){
      const hay = [t.id,t.title,t.assignee?.name||"Anonymous"].join(" ").toLowerCase();
      if(!hay.includes(s)) return false;
    }
    return true;
  });
}
function applySort(list){
  const {key,dir}=state.sort, m=dir==="asc"?1:-1;
  return list.slice().sort((a,b)=>{
    let va=a[key], vb=b[key];
    if(key==="priority"){ va=priorityRank(a.priority); vb=priorityRank(b.priority); }
    else if(key==="status"){ va=statusRank(a.status); vb=statusRank(b.status); }
    else if(key==="createdAt"){ va=new Date(a.createdAt).getTime(); vb=new Date(b.createdAt).getTime(); }
    return (va>vb?1:va<vb?-1:0)*m;
  });
}

/* ---------- Render ---------- */
function render(){
  persist();
  buildAssigneeOptions();

  const filtered = applyFilters(state.tickets);
  const sorted   = applySort(filtered);

  $("#showing").textContent = `Showing ${filtered.length} tickets`;

  tbody.innerHTML = sorted.map(t=>{
    const stClass = t.status==="New" ? "new" : t.status==="Progress" ? "progress" : "done";
    const prClass = t.priority.toLowerCase();
    return `
      <tr>
        <td>${t.id}</td>
        <td>${t.title}</td>
        <td><span class="pill ${stClass}">${t.status}</span></td>
        <td><span class="pill ${prClass}">${t.priority}</span></td>
        <td>
          ${t.assignee
            ? `<div class="assignee"><span class="dot">${initials(t.assignee.name)}</span>${t.assignee.name}</div>`
            : "Anonymous"}
        </td>
        <td>${fmtDate(t.createdAt)}</td>
        <td>
          <div class="action-row">
            <button class="follow" data-act="follow" data-id="${t.id}">Follow Up</button>
            <button class="delete" title="Delete" data-act="delete" data-id="${t.id}">🗑</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  // Update sort chevrons
  document.querySelectorAll(".th-sort").forEach(b=>{
    b.classList.remove("asc","desc");
    if(b.dataset.sort===state.sort.key) b.classList.add(state.sort.dir);
  });
}
render();

/* ---------- Events: toolbar ---------- */
$("#searchBox").addEventListener("input", e=>{ state.filters.search=e.target.value; render(); });
$("#filterStatus").addEventListener("change", e=>{ state.filters.status=e.target.value; render(); });
$("#filterPriority").addEventListener("change", e=>{ state.filters.priority=e.target.value; render(); });
$("#filterAssignee").addEventListener("change", e=>{ state.filters.assignee=e.target.value; render(); });

document.querySelectorAll(".th-sort").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const key=btn.dataset.sort;
    if(state.sort.key===key){
      state.sort.dir = state.sort.dir==="asc" ? "desc" : "asc";
    }else{
      state.sort.key=key;
      state.sort.dir = (key==="createdAt") ? "desc" : "asc";
    }
    render();
  });
});

/* ---------- Row actions ---------- */
tbody.addEventListener("click", e=>{
  const btn=e.target.closest("button"); if(!btn) return;
  const id=btn.dataset.id;
  if(btn.dataset.act==="delete"){
    if(confirm("Delete this ticket?")){
      state.tickets = state.tickets.filter(t=>t.id!==id);
      render();
    }
  }else if(btn.dataset.act==="follow"){
    alert("Follow up recorded for "+id);
  }
});

/* ---------- Modal (Add / Edit for future) ---------- */
const modal = $("#modal");
function openModal(editId=null){
  state.editingId = editId;
  $("#dlgTitle").textContent = editId ? "Edit Ticket" : "Add Ticket";
  $("#saveTicket").textContent = editId ? "Save" : "Create";
  if(editId){
    const t=state.tickets.find(x=>x.id===editId);
    $("#fTitle").value=t.title;
    $("#fStatus").value=t.status;
    $("#fPriority").value=t.priority;
    $("#fAssignee").value=t.assignee?.name||"";
    $("#fDesc").value=t.description||"";
  }else{
    $("#fTitle").value="";
    $("#fStatus").value="New";
    $("#fPriority").value="Low";
    $("#fAssignee").value="";
    $("#fDesc").value="";
  }
  modal.classList.add("show");
  $("#fTitle").focus();
}
function closeModal(){ modal.classList.remove("show"); state.editingId=null; }

$("#addTicketBtn").addEventListener("click", ()=>openModal());
$("#closeModal").addEventListener("click", closeModal);
$("#cancelModal").addEventListener("click", closeModal);
modal.addEventListener("click", e=>{ if(e.target===modal) closeModal(); });
document.addEventListener("keydown", e=>{ if(e.key==="Escape") closeModal(); });

$("#saveTicket").addEventListener("click", ()=>{
  const title=$("#fTitle").value.trim();
  if(!title) return alert("Title is required.");
  const payload={
    title,
    status: $("#fStatus").value,
    priority: $("#fPriority").value,
    assignee: $("#fAssignee").value.trim() ? {name: $("#fAssignee").value.trim()} : null,
    description: $("#fDesc").value.trim()
  };

  if(state.editingId){
    const i=state.tickets.findIndex(t=>t.id===state.editingId);
    state.tickets[i] = { ...state.tickets[i], ...payload };
  }else{
    const next = Math.max(...state.tickets.map(t=>parseInt(t.id.split("-")[1],10))) + 1;
    state.tickets.unshift({
      id: "TKT-"+String(next).padStart(3,"0"),
      createdAt: new Date().toISOString(),
      ...payload
    });
  }
  closeModal(); render();
});
