const $ = (sel) => document.querySelector(sel);

const PRESETS = {
  example: [
    "A->B", "A->C", "B->D", "C->E", "E->F",
    "X->Y", "Y->Z", "Z->X",
    "P->Q", "Q->R",
    "G->H", "G->H", "G->I",
    "hello", "1->2", "A->",
  ],
  cycle: ["A->B", "B->C", "C->A", "M->N", "N->O"],
  diamond: ["A->B", "A->C", "B->D", "C->D", "E->F"],
};

const dataInput = $("#dataInput");
const submitBtn = $("#submitBtn");
const errorBox = $("#errorBox");
const parsedHint = $("#parsedHint");

const emptyState = $("#emptyState");
const visualPane = $("#visualPane");
const jsonPane = $("#jsonPane");

document.querySelectorAll(".preset").forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.preset;
    if (!key) return;
    const arr = PRESETS[key];
    if (arr) dataInput.value = arr.join("\n");
    updateHint();
  });
});

$("#clearBtn").addEventListener("click", () => {
  dataInput.value = "";
  updateHint();
});

document.querySelectorAll(".tab").forEach((t) => {
  t.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((x) => x.classList.remove("active"));
    t.classList.add("active");
    const which = t.dataset.tab;
    if (which === "json") {
      visualPane.hidden = true;
      jsonPane.hidden = false;
    } else {
      visualPane.hidden = false;
      jsonPane.hidden = true;
    }
  });
});

dataInput.addEventListener("input", updateHint);

function parseInput(text) {
  const t = text.trim();
  if (!t) return [];
  if (t.startsWith("[")) {
    try {
      const parsed = JSON.parse(t);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }
  return t
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function updateHint() {
  const arr = parseInput(dataInput.value);
  parsedHint.textContent = arr.length
    ? `${arr.length} entr${arr.length === 1 ? "y" : "ies"} parsed`
    : "";
}

submitBtn.addEventListener("click", async () => {
  errorBox.hidden = true;
  const data = parseInput(dataInput.value);
  if (data.length === 0) {
    showError("Please enter at least one edge.");
    return;
  }
  setLoading(true);
  try {
    const res = await fetch("/bfhl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || `Request failed (${res.status})`);
    }
    render(json);
  } catch (err) {
    showError(err.message || "Network error");
  } finally {
    setLoading(false);
  }
});

function setLoading(on) {
  submitBtn.classList.toggle("loading", on);
  submitBtn.disabled = on;
  submitBtn.querySelector(".btn-label").textContent = on ? "Processing…" : "Process";
}

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.hidden = false;
}

function render(payload) {
  emptyState.hidden = true;
  visualPane.hidden = false;

  jsonPane.textContent = JSON.stringify(payload, null, 2);

  $("#identityBlock").innerHTML = `
    <div class="id-item"><div class="k">user_id</div><div class="v">${escape(payload.user_id)}</div></div>
    <div class="id-item"><div class="k">email_id</div><div class="v">${escape(payload.email_id)}</div></div>
    <div class="id-item"><div class="k">roll number</div><div class="v">${escape(payload.college_roll_number)}</div></div>
  `;

  const s = payload.summary || {};
  $("#summaryRow").innerHTML = `
    <div class="stat good">
      <div class="label">Total trees</div>
      <div class="value">${s.total_trees ?? 0}</div>
    </div>
    <div class="stat warn">
      <div class="label">Total cycles</div>
      <div class="value">${s.total_cycles ?? 0}</div>
    </div>
    <div class="stat accent">
      <div class="label">Largest tree root</div>
      <div class="value text">${escape(s.largest_tree_root || "—")}</div>
    </div>
  `;

  const list = $("#hierarchiesList");
  list.innerHTML = "";
  const hierarchies = payload.hierarchies || [];
  if (hierarchies.length === 0) {
    list.innerHTML = `<div class="cycle-msg">No hierarchies built.</div>`;
  }
  hierarchies.forEach((h) => list.appendChild(renderHierarchy(h)));

  renderChips($("#invalidList"), payload.invalid_entries || []);
  renderChips($("#dupList"), payload.duplicate_edges || []);
}

function renderHierarchy(h) {
  const wrap = document.createElement("div");
  wrap.className = "tree-card";
  const head = document.createElement("div");
  head.className = "tree-head";
  head.innerHTML = `
    <span class="root-badge">${escape(h.root)}</span>
    ${h.has_cycle ? `<span class="pill cycle">cycle</span>` : `<span class="pill depth">depth ${h.depth}</span>`}
  `;
  wrap.appendChild(head);

  const body = document.createElement("div");
  body.className = "tree-body";
  if (h.has_cycle) {
    body.innerHTML = `<div class="cycle-msg">Cyclic group — no tree to render.</div>`;
  } else {
    body.appendChild(treeToHTML(h.tree, true));
  }
  wrap.appendChild(body);
  return wrap;
}

function treeToHTML(obj, isRoot = false) {
  const ul = document.createElement("ul");
  Object.keys(obj).forEach((key) => {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.className = "node" + (isRoot ? " root" : "");
    span.textContent = key;
    li.appendChild(span);
    const children = obj[key];
    if (children && Object.keys(children).length > 0) {
      li.appendChild(treeToHTML(children, false));
    }
    ul.appendChild(li);
  });
  return ul;
}

function renderChips(el, items) {
  el.innerHTML = "";
  if (!items.length) {
    const li = document.createElement("li");
    li.className = "empty-chip";
    li.textContent = "—";
    el.appendChild(li);
    return;
  }
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = typeof item === "string" ? item : JSON.stringify(item);
    el.appendChild(li);
  });
}

function escape(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;",
  }[c]));
}

dataInput.value = PRESETS.example.join("\n");
updateHint();
