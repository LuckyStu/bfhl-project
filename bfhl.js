const VALID_EDGE = /^[A-Z]->[A-Z]$/;

function processData(rawData) {
  const invalid_entries = [];
  const duplicate_edges = [];
  const seenEdges = new Set();
  const validEdges = [];

  if (!Array.isArray(rawData)) {
    const err = new Error("`data` must be an array of strings");
    err.status = 400;
    throw err;
  }

  for (const entry of rawData) {
    if (typeof entry !== "string") {
      invalid_entries.push(entry);
      continue;
    }
    const trimmed = entry.trim();
    if (!VALID_EDGE.test(trimmed)) {
      invalid_entries.push(entry);
      continue;
    }
    const [parent, child] = trimmed.split("->");
    if (parent === child) {
      invalid_entries.push(entry);
      continue;
    }
    const key = `${parent}->${child}`;
    if (seenEdges.has(key)) {
      if (!duplicate_edges.includes(key)) duplicate_edges.push(key);
      continue;
    }
    seenEdges.add(key);
    validEdges.push({ parent, child });
  }

  const parentOf = new Map();
  const childrenOf = new Map();
  const orderIndex = new Map();
  let orderCounter = 0;

  const touch = (node) => {
    if (!childrenOf.has(node)) childrenOf.set(node, []);
    if (!orderIndex.has(node)) orderIndex.set(node, orderCounter++);
  };

  for (const { parent, child } of validEdges) {
    touch(parent);
    touch(child);
    if (parentOf.has(child)) continue;
    parentOf.set(child, parent);
    childrenOf.get(parent).push(child);
  }

  const dsuParent = new Map();
  const find = (x) => {
    if (dsuParent.get(x) !== x) dsuParent.set(x, find(dsuParent.get(x)));
    return dsuParent.get(x);
  };
  const union = (a, b) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) dsuParent.set(ra, rb);
  };

  for (const node of childrenOf.keys()) dsuParent.set(node, node);
  for (const [child, parent] of parentOf.entries()) union(parent, child);

  const groups = new Map();
  for (const node of childrenOf.keys()) {
    const root = find(node);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(node);
  }

  const hierarchies = [];

  for (const nodes of groups.values()) {
    const nodeSet = new Set(nodes);
    const rootCandidates = nodes.filter((n) => !parentOf.has(n));

    const earliest = Math.min(...nodes.map((n) => orderIndex.get(n)));

    if (rootCandidates.length === 0) {
      const cycleRoot = [...nodes].sort()[0];
      hierarchies.push({
        _order: earliest,
        root: cycleRoot,
        tree: {},
        has_cycle: true,
      });
      continue;
    }

    const treeRoot = rootCandidates.sort()[0];
    const buildTree = (node) => {
      const obj = {};
      const kids = (childrenOf.get(node) || []).filter((c) => nodeSet.has(c));
      for (const k of kids) obj[k] = buildTree(k);
      return obj;
    };
    const treeBody = { [treeRoot]: buildTree(treeRoot) };

    const computeDepth = (node) => {
      const kids = (childrenOf.get(node) || []).filter((c) => nodeSet.has(c));
      if (kids.length === 0) return 1;
      return 1 + Math.max(...kids.map(computeDepth));
    };
    const depth = computeDepth(treeRoot);

    hierarchies.push({
      _order: earliest,
      root: treeRoot,
      tree: treeBody,
      depth,
    });
  }

  hierarchies.sort((a, b) => a._order - b._order);
  hierarchies.forEach((h) => delete h._order);

  const treeOnly = hierarchies.filter((h) => !h.has_cycle);
  let largest_tree_root = "";
  if (treeOnly.length > 0) {
    let best = treeOnly[0];
    for (const h of treeOnly) {
      if (
        h.depth > best.depth ||
        (h.depth === best.depth && h.root < best.root)
      ) {
        best = h;
      }
    }
    largest_tree_root = best.root;
  }

  const summary = {
    total_trees: treeOnly.length,
    total_cycles: hierarchies.length - treeOnly.length,
    largest_tree_root,
  };

  return { hierarchies, invalid_entries, duplicate_edges, summary };
}

module.exports = { processData };
