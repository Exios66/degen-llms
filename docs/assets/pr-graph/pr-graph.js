(() => {
  "use strict";

  const STATE_COLOR = {
    MERGED: "#2f9e5d",
    OPEN: "#2f6fed",
    DRAFT: "#9aa3b2",
    CLOSED: "#c0392b",
  };

  const AREA_RING = {
    casino: "#c5050c",
    hotel: "#b8860b",
    rpg: "#5b4fcf",
    docs: "#1f6feb",
    pool: "#0d8a6a",
    infra: "#6b7280",
    other: "#94a3b8",
  };

  function resolveDataUrl() {
    const el = document.getElementById("pr-graph-app");
    const attr = el && el.getAttribute("data-src");
    if (attr) return attr;
    const scripts = document.getElementsByTagName("script");
    for (let i = scripts.length - 1; i >= 0; i -= 1) {
      const src = scripts[i].src || "";
      if (src.includes("pr-graph.js")) {
        return src.replace(/pr-graph\.js(?:\?.*)?$/, "pr-data.json");
      }
    }
    return "assets/pr-graph/pr-data.json";
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function parseTime(iso) {
    return iso ? Date.parse(iso) : NaN;
  }

  function fmtDate(ms) {
    if (!Number.isFinite(ms)) return "—";
    return new Date(ms).toISOString().slice(0, 10);
  }

  function truncate(s, n) {
    if (!s) return "";
    return s.length > n ? `${s.slice(0, n - 1)}…` : s;
  }

  class ForceSim {
    constructor(nodes, edges) {
      this.nodes = nodes;
      this.edges = edges;
      this.alpha = 1;
      this.alphaDecay = 0.022;
      this.velocityDecay = 0.82;
    }

    step(width, height, timelineBias) {
      if (this.alpha < 0.01) return false;
      const nodes = this.nodes;
      const n = nodes.length;
      const charge = -220;
      const linkDist = 42;
      const centerX = width * 0.5;
      const centerY = height * 0.52;

      for (let i = 0; i < n; i += 1) {
        for (let j = i + 1; j < n; j += 1) {
          const a = nodes[i];
          const b = nodes[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let dist2 = dx * dx + dy * dy || 0.01;
          const dist = Math.sqrt(dist2);
          const force = (charge * this.alpha) / dist2;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }
      }

      for (const e of this.edges) {
        const a = e.sourceNode;
        const b = e.targetNode;
        if (!a.visible || !b.visible) continue;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const diff = ((dist - linkDist) / dist) * 0.04 * this.alpha;
        const fx = dx * diff;
        const fy = dy * diff;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }

      for (const node of nodes) {
        if (!node.visible) continue;
        // Soft pull toward elliptical cloud + mild chronological X bias.
        node.vx += (centerX - node.x) * 0.008 * this.alpha;
        node.vy += (centerY - node.y) * 0.01 * this.alpha;
        if (timelineBias) {
          const targetX = node.timelineX;
          node.vx += (targetX - node.x) * 0.02 * this.alpha;
        }
        node.vx *= this.velocityDecay;
        node.vy *= this.velocityDecay;
        node.x += node.vx;
        node.y += node.vy;
        node.x = clamp(node.x, 24, width - 24);
        node.y = clamp(node.y, 24, height - 24);
      }

      this.alpha *= 1 - this.alphaDecay;
      return true;
    }

    kick(amount = 0.35) {
      this.alpha = Math.min(1, this.alpha + amount);
    }
  }

  function buildApp(root, data) {
    const counts = data.counts || {};
    root.innerHTML = `
      <div class="pr-graph-shell" role="region" aria-label="Pull request development graph">
        <div class="pr-graph-toolbar">
          <div class="pr-graph-brand">
            <span class="dot" aria-hidden="true"></span>
            <span>Mandalay Bay / degen-llms</span>
            <span class="meta">ACTIVE · ${counts.nodes || 0} PRs</span>
          </div>
          <div class="pr-graph-filters" role="group" aria-label="Edge filters">
            <button type="button" data-edge="all" class="active">All edges</button>
            <button type="button" data-edge="timeline">Timeline</button>
            <button type="button" data-edge="area-flow">Area flow</button>
            <button type="button" data-edge="relates">Relates to</button>
          </div>
        </div>
        <div class="pr-graph-body">
          <div class="pr-graph-sidebar" role="navigation" aria-label="Pull request nodes">
            <header>Nodes — <span id="prg-node-count">${counts.nodes || 0}</span></header>
            <input class="pr-graph-search" id="prg-search" type="search" placeholder="Filter PRs…" aria-label="Filter pull requests" />
            <div class="pr-graph-list" id="prg-list"></div>
          </div>
          <div class="pr-graph-canvas-wrap" id="prg-canvas-wrap">
            <canvas id="prg-canvas"></canvas>
            <div class="pr-graph-tooltip" id="prg-tooltip"></div>
          </div>
        </div>
        <div class="pr-graph-footer">
          <div class="pr-graph-legend" aria-label="Status legend">
            <span><i class="draft"></i> DRAFT</span>
            <span><i class="open"></i> OPEN</span>
            <span><i class="merged"></i> MERGED</span>
            <span><i class="closed"></i> CLOSED</span>
          </div>
          <div class="pr-graph-timeline">
            <label for="prg-time">Through</label>
            <input id="prg-time" type="range" min="0" max="1000" value="1000" />
            <span class="date" id="prg-time-label">all</span>
          </div>
          <div class="pr-graph-zoom">
            <button type="button" id="prg-zoom-out" aria-label="Zoom out">−</button>
            <button type="button" id="prg-zoom-in" aria-label="Zoom in">+</button>
            <button type="button" id="prg-fit" aria-label="Fit to screen">⤢</button>
          </div>
        </div>
      </div>
    `;

    const canvas = root.querySelector("#prg-canvas");
    const wrap = root.querySelector("#prg-canvas-wrap");
    const listEl = root.querySelector("#prg-list");
    const searchEl = root.querySelector("#prg-search");
    const tip = root.querySelector("#prg-tooltip");
    const timeEl = root.querySelector("#prg-time");
    const timeLabel = root.querySelector("#prg-time-label");
    const countEl = root.querySelector("#prg-node-count");

    const times = data.nodes
      .map((n) => parseTime(n.when || n.createdAt))
      .filter(Number.isFinite);
    const tMin = Math.min(...times);
    const tMax = Math.max(...times);

    const nodes = data.nodes.map((n, i) => {
      const t = parseTime(n.when || n.createdAt);
      const frac = Number.isFinite(t) ? (t - tMin) / (tMax - tMin || 1) : i / data.nodes.length;
      const angle = (i / Math.max(1, data.nodes.length)) * Math.PI * 2;
      return {
        ...n,
        t,
        frac,
        x: 400 + Math.cos(angle) * (120 + frac * 160) + (Math.random() - 0.5) * 40,
        y: 300 + Math.sin(angle) * (90 + (1 - frac) * 110) + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0,
        visible: true,
        timelineX: 80 + frac * 640,
        r: n.state === "MERGED" ? 5.5 : 6.5,
      };
    });

    const byId = new Map(nodes.map((n) => [n.id, n]));
    const edges = (data.edges || [])
      .map((e) => ({
        ...e,
        sourceNode: byId.get(e.source),
        targetNode: byId.get(e.target),
      }))
      .filter((e) => e.sourceNode && e.targetNode);

    let edgeKind = "all";
    let query = "";
    let selected = null;
    let hover = null;
    let scale = 1;
    let panX = 0;
    let panY = 0;
    let dragging = false;
    let dragNode = null;
    let lastPtr = null;
    let cutoff = tMax;
    let timelineBias = false;

    const sim = new ForceSim(nodes, edges);

    function matchesQuery(node) {
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        String(node.number).includes(q) ||
        (node.title || "").toLowerCase().includes(q) ||
        (node.area || "").toLowerCase().includes(q) ||
        (node.author || "").toLowerCase().includes(q)
      );
    }

    function applyFilters() {
      for (const node of nodes) {
        const inTime = !Number.isFinite(node.t) || node.t <= cutoff;
        node.visible = inTime && matchesQuery(node);
      }
      const visibleCount = nodes.filter((n) => n.visible).length;
      countEl.textContent = String(visibleCount);
      renderList();
      sim.kick(0.45);
    }

    function renderList() {
      const frag = document.createDocumentFragment();
      const sorted = nodes
        .filter((n) => n.visible)
        .slice()
        .sort((a, b) => b.number - a.number);
      for (const node of sorted) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `pr-graph-item${selected === node ? " active" : ""}`;
        btn.innerHTML = `
          <span class="status ${node.state}" aria-hidden="true"></span>
          <span>
            <span class="id">#${node.number}</span>
            <span class="title">${truncate(node.title, 42)}</span>
          </span>
        `;
        btn.addEventListener("click", () => {
          selected = node;
          focusNode(node);
          renderList();
          showTip(node, true);
        });
        frag.appendChild(btn);
      }
      listEl.innerHTML = "";
      listEl.appendChild(frag);
    }

    function focusNode(node) {
      const rect = wrap.getBoundingClientRect();
      panX = rect.width / 2 - node.x * scale;
      panY = rect.height / 2 - node.y * scale;
      sim.kick(0.2);
    }

    function showTip(node, pinned) {
      if (!node) {
        tip.classList.remove("visible");
        tip.innerHTML = "";
        return;
      }
      const when = fmtDate(node.t);
      tip.innerHTML = `
        <strong>#${node.number} · ${node.state}</strong>
        ${truncate(node.title, 120)}<br/>
        <span style="opacity:.8">${node.area} · ${node.author} · ${when}</span><br/>
        <a href="${node.url}" target="_blank" rel="noopener">Open pull request ↗</a>
      `;
      tip.classList.add("visible");
      if (!pinned && hover) {
        const rect = wrap.getBoundingClientRect();
        const sx = hover.x * scale + panX;
        const sy = hover.y * scale + panY;
        tip.style.left = `${clamp(sx + 14, 8, rect.width - 290)}px`;
        tip.style.top = `${clamp(sy + 14, 8, rect.height - 110)}px`;
      } else {
        tip.style.left = "12px";
        tip.style.top = "12px";
      }
    }

    function edgeVisible(e) {
      if (!e.sourceNode.visible || !e.targetNode.visible) return false;
      if (edgeKind === "all") return true;
      return e.kind === edgeKind;
    }

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = wrap.getBoundingClientRect();
      const w = Math.max(280, Math.floor(rect.width) || wrap.clientWidth || 640);
      const h = Math.max(280, Math.floor(rect.height) || wrap.clientHeight || 480);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const node of nodes) {
        node.timelineX = 48 + node.frac * Math.max(120, w - 96);
        // Keep nodes inside the visible world after layout changes.
        node.x = clamp(node.x, 24, w - 24);
        node.y = clamp(node.y, 24, h - 24);
      }
      return { w, h, ctx };
    }

    let view = resize();

    function draw() {
      const { w, h, ctx } = view;
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.translate(panX, panY);
      ctx.scale(scale, scale);

      ctx.lineWidth = 1 / scale;
      for (const e of edges) {
        if (!edgeVisible(e)) continue;
        const a = e.sourceNode;
        const b = e.targetNode;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        if (e.kind === "timeline") ctx.strokeStyle = "rgba(90,130,180,0.28)";
        else if (e.kind === "area-flow") ctx.strokeStyle = "rgba(197,5,12,0.18)";
        else ctx.strokeStyle = "rgba(120,100,200,0.22)";
        ctx.stroke();
      }

      for (const node of nodes) {
        if (!node.visible) continue;
        const color = STATE_COLOR[node.state] || "#888";
        const isHot = node === selected || node === hover;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r + (isHot ? 2 : 0), 0, Math.PI * 2);
        if (node.state === "OPEN") {
          ctx.fillStyle = "#fff";
          ctx.fill();
          ctx.lineWidth = 2 / scale;
          ctx.strokeStyle = color;
          ctx.stroke();
        } else {
          ctx.fillStyle = color;
          ctx.fill();
        }
        // Area accent ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r + 2.8 + (isHot ? 1.5 : 0), 0, Math.PI * 2);
        ctx.strokeStyle = AREA_RING[node.area] || "#94a3b8";
        ctx.globalAlpha = isHot ? 0.9 : 0.35;
        ctx.lineWidth = (isHot ? 2 : 1) / scale;
        ctx.stroke();
        ctx.globalAlpha = 1;

        if (node.state === "MERGED") {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 1.2 / scale;
          ctx.beginPath();
          ctx.moveTo(node.x - 2, node.y);
          ctx.lineTo(node.x - 0.3, node.y + 1.8);
          ctx.lineTo(node.x + 2.4, node.y - 1.8);
          ctx.stroke();
        }
      }

      ctx.restore();
    }

    function frame() {
      const moving = sim.step(view.w, view.h, timelineBias || edgeKind === "timeline");
      draw();
      if (moving || dragging) requestAnimationFrame(frame);
      else requestAnimationFrame(frameIdle);
    }

    let idleScheduled = false;
    function frameIdle() {
      idleScheduled = false;
      draw();
    }

    function requestDraw() {
      if (!idleScheduled) {
        idleScheduled = true;
        requestAnimationFrame(frame);
      }
    }

    function hitTest(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const x = (clientX - rect.left - panX) / scale;
      const y = (clientY - rect.top - panY) / scale;
      let best = null;
      let bestD = 12 / scale;
      for (const node of nodes) {
        if (!node.visible) continue;
        const d = Math.hypot(node.x - x, node.y - y);
        if (d < bestD) {
          best = node;
          bestD = d;
        }
      }
      return best;
    }

    wrap.addEventListener("pointerdown", (ev) => {
      const node = hitTest(ev.clientX, ev.clientY);
      dragging = true;
      canvas.classList.add("dragging");
      lastPtr = { x: ev.clientX, y: ev.clientY };
      dragNode = node;
      if (node) {
        selected = node;
        renderList();
        showTip(node, false);
      }
      wrap.setPointerCapture(ev.pointerId);
    });

    wrap.addEventListener("pointermove", (ev) => {
      if (dragging && lastPtr) {
        const dx = ev.clientX - lastPtr.x;
        const dy = ev.clientY - lastPtr.y;
        lastPtr = { x: ev.clientX, y: ev.clientY };
        if (dragNode) {
          dragNode.x += dx / scale;
          dragNode.y += dy / scale;
          dragNode.vx = 0;
          dragNode.vy = 0;
          sim.kick(0.15);
        } else {
          panX += dx;
          panY += dy;
        }
        requestDraw();
        return;
      }
      const node = hitTest(ev.clientX, ev.clientY);
      if (node !== hover) {
        hover = node;
        showTip(node || selected, !node && !!selected);
        requestDraw();
      } else if (node) {
        showTip(node, false);
      }
    });

    wrap.addEventListener("pointerup", (ev) => {
      dragging = false;
      dragNode = null;
      canvas.classList.remove("dragging");
      try {
        wrap.releasePointerCapture(ev.pointerId);
      } catch (_) {
        /* ignore */
      }
    });

    wrap.addEventListener("dblclick", (ev) => {
      const node = hitTest(ev.clientX, ev.clientY);
      if (node && node.url) window.open(node.url, "_blank", "noopener");
    });

    wrap.addEventListener(
      "wheel",
      (ev) => {
        ev.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const mx = ev.clientX - rect.left;
        const my = ev.clientY - rect.top;
        const before = scale;
        scale = clamp(scale * (ev.deltaY > 0 ? 0.9 : 1.1), 0.35, 3.2);
        panX = mx - ((mx - panX) / before) * scale;
        panY = my - ((my - panY) / before) * scale;
        requestDraw();
      },
      { passive: false }
    );

    root.querySelectorAll(".pr-graph-filters button").forEach((btn) => {
      btn.addEventListener("click", () => {
        root.querySelectorAll(".pr-graph-filters button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        edgeKind = btn.getAttribute("data-edge") || "all";
        timelineBias = edgeKind === "timeline";
        sim.kick(0.55);
        requestDraw();
      });
    });

    searchEl.addEventListener("input", () => {
      query = searchEl.value.trim();
      applyFilters();
      requestDraw();
    });

    timeEl.addEventListener("input", () => {
      const frac = Number(timeEl.value) / 1000;
      cutoff = tMin + frac * (tMax - tMin);
      timeLabel.textContent = frac >= 0.999 ? "all" : fmtDate(cutoff);
      applyFilters();
      requestDraw();
    });

    root.querySelector("#prg-zoom-in").addEventListener("click", () => {
      scale = clamp(scale * 1.15, 0.35, 3.2);
      requestDraw();
    });
    root.querySelector("#prg-zoom-out").addEventListener("click", () => {
      scale = clamp(scale / 1.15, 0.35, 3.2);
      requestDraw();
    });
    root.querySelector("#prg-fit").addEventListener("click", () => {
      scale = 1;
      panX = 0;
      panY = 0;
      sim.kick(0.7);
      requestDraw();
    });

    window.addEventListener("resize", () => {
      view = resize();
      sim.kick(0.3);
      requestDraw();
    });

    applyFilters();
    // Fit initial view after first layout.
    requestAnimationFrame(() => {
      view = resize();
      panX = 0;
      panY = 0;
      sim.kick(1);
      requestAnimationFrame(frame);
    });
  }

  async function boot() {
    const root = document.getElementById("pr-graph-app");
    if (!root) return;
    root.classList.add("pr-graph-page");
    try {
      const res = await fetch(resolveDataUrl());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      buildApp(root, data);
    } catch (err) {
      root.innerHTML = `<div class="pr-graph-shell"><div class="pr-graph-empty">Could not load PR graph data (${err.message}).</div></div>`;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
