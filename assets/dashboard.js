/* Miami Marathon dashboard - reads window.DASHBOARD_DATA from data/data.js */
(function () {
  "use strict";
  const D = window.DASHBOARD_DATA || {};
  const plan = D.plan;
  const acts = (D.activities || []).slice();
  const athlete = D.athlete || {};
  const runs = acts.filter((a) => a.is_run && a.distance_mi > 0.3);

  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const pad = (n) => String(n).padStart(2, "0");
  const parseD = (s) => new Date(s.length <= 10 ? s + "T00:00:00" : s);
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const mondayOf = (d) => { const x = new Date(d); const w = (x.getDay() + 6) % 7; return addDays(x, -w); };
  const fmtPace = (p) => (p ? `${Math.floor(p)}:${pad(Math.round((p % 1) * 60))}/mi` : "-");
  const round1 = (x) => Math.round(x * 10) / 10;

  const TODAY = new Date();
  TODAY.setHours(0, 0, 0, 0);

  /* ---------------- hero + countdown ---------------- */
  const raceDate = parseD(plan.race_date);
  const daysToGo = Math.round((raceDate - TODAY) / 86400000);
  const week1 = parseD(plan.week1_monday);

  let curWeekIdx = 0; // 1-based; 0 = not started
  plan.weeks.forEach((w) => {
    const s = parseD(w.start);
    if (TODAY >= s && TODAY <= addDays(s, 6)) curWeekIdx = w.week;
  });
  if (curWeekIdx === 0 && TODAY > addDays(parseD(plan.weeks[plan.weeks.length - 1].start), 6)) {
    curWeekIdx = plan.n_weeks + 1; // done
  }
  const started = curWeekIdx >= 1 && curWeekIdx <= plan.n_weeks;
  const shownWeekIdx = started ? curWeekIdx : 1;
  const shownWeek = plan.weeks[shownWeekIdx - 1];

  const hero = $("#hero");
  hero.innerHTML = `
    <div class="hero-top">
      <div>
        <h1>${plan.race} &nbsp;<span class="pill">${plan.goal_time} &middot; ${plan.goal_pace}</span></h1>
        <div class="sub">${raceDate.toDateString()} &middot; 6:00 AM start &middot; goal pace ${plan.goal_pace}</div>
      </div>
      <div class="sub">last Strava sync: ${D.synced_at ? new Date(D.synced_at).toLocaleString() : "never"}</div>
    </div>
    <div class="countdown">
      <div><div class="big">${daysToGo}</div><div class="lbl">days to Miami</div></div>
      <div><div class="big">${started ? curWeekIdx : "-"}<span style="font-size:16px;color:var(--muted)">/${plan.n_weeks}</span></div><div class="lbl">training week</div></div>
      <div><div class="big" style="font-size:22px">${started ? shownWeek.phase : "Prep"}</div><div class="lbl">phase</div></div>
      <div><div class="big" style="font-size:22px">${Math.ceil(daysToGo / 7)}</div><div class="lbl">weeks left</div></div>
    </div>
    <div class="phasebar">${plan.weeks.map((w) =>
      `<span class="${w.week === curWeekIdx ? "on" : w.week < curWeekIdx ? "past" : ""}" title="W${w.week} ${w.phase} - ${w.target_mileage} mi"></span>`
    ).join("")}</div>`;

  /* ---------------- weekly actual mileage map ---------------- */
  const weekMiles = {};      // mondayKey -> total run miles
  const weekLongest = {};    // mondayKey -> longest single run
  runs.forEach((a) => {
    const k = ymd(mondayOf(parseD(a.date)));
    weekMiles[k] = (weekMiles[k] || 0) + a.distance_mi;
    weekLongest[k] = Math.max(weekLongest[k] || 0, a.distance_mi);
  });

  const milesInRange = (start, end) =>
    runs.filter((a) => { const d = parseD(a.date); return d >= start && d < end; })
        .reduce((s, a) => s + a.distance_mi, 0);

  /* ---------------- stat tiles ---------------- */
  const last7 = milesInRange(addDays(TODAY, -7), addDays(TODAY, 1));
  const prev7 = milesInRange(addDays(TODAY, -14), addDays(TODAY, -7));
  const last28 = milesInRange(addDays(TODAY, -28), addDays(TODAY, 1)) / 4;
  const prev28 = milesInRange(addDays(TODAY, -56), addDays(TODAY, -28)) / 4;
  const longest8 = Math.max(0, ...runs.filter((a) => parseD(a.date) >= addDays(TODAY, -56)).map((a) => a.distance_mi));

  const delta = (a, b, unit) => {
    if (!b) return `<span class="flat">-</span>`;
    const d = a - b, cls = d > 0.3 ? "up" : d < -0.3 ? "down" : "flat";
    return `<span class="${cls}">${d > 0 ? "+" : ""}${round1(d)}${unit} vs prior</span>`;
  };
  $("#tiles").innerHTML = `
    <div class="tile"><div class="v">${round1(last7)} mi</div><div class="k">last 7 days</div><div class="d">${delta(last7, prev7, " mi")}</div></div>
    <div class="tile"><div class="v">${round1(last28)} mi</div><div class="k">weekly avg (4 wk)</div><div class="d">${delta(last28, prev28, " mi")}</div></div>
    <div class="tile"><div class="v">${round1(longest8)} mi</div><div class="k">longest run (8 wk)</div><div class="d flat">plan peak: 20 mi</div></div>
    <div class="tile"><div class="v">${athlete.vo2max || "-"}</div><div class="k">Garmin VO2max</div><div class="d flat">pred. marathon ${athlete.race_predictions ? athlete.race_predictions.marathon : "-"}</div></div>`;

  /* ---------------- this week + next week ---------------- */
  function matchActivity(sess) {
    const target = parseD(sess.date);
    const want = sess.miles;
    const cands = acts.filter((a) => {
      const d = parseD(a.date);
      return Math.abs(d - target) <= 86400000 * 1.0;
    });
    if (sess.kind === "strength") {
      const s = cands.find((a) => /weight|strength|workout/i.test(a.sport));
      return s || cands.find((a) => a.is_run);
    }
    const rc = cands.filter((a) => a.is_run);
    if (!rc.length) return null;
    // best = closest distance, must be >= 55% of target (or any run if target tiny)
    rc.sort((a, b) => Math.abs(a.distance_mi - want) - Math.abs(b.distance_mi - want));
    if (want <= 2 || rc[0].distance_mi >= want * 0.55) return rc[0];
    return rc[0]; // still show it, styling will note short
  }

  function renderWeek(w, label) {
    const wrap = el("div", "panel");
    const actual = w.sessions.reduce((s, x) => {
      const m = x.kind !== "rest" ? matchActivity(x) : null;
      return s + (m && m.is_run ? m.distance_mi : 0);
    }, 0);
    wrap.appendChild(el("h2", null,
      `${label}: week ${w.week} &middot; ${w.phase} &nbsp;<span class="pill">plan ${w.planned_mileage} mi &middot; done ${round1(actual)} mi</span>`));
    if (w.notes && w.notes.length) w.notes.forEach((n) => wrap.appendChild(el("div", "note", n)));

    const grid = el("div", "week");
    w.sessions.forEach((s) => {
      const d = parseD(s.date);
      const isToday = ymd(d) === ymd(TODAY);
      const day = el("div", `day kind-${s.kind}${isToday ? " today" : ""}`);
      const past = d < TODAY;
      let statusHtml = "";
      if (s.kind === "rest") {
        statusHtml = `<div class="status rest">rest</div>`;
      } else {
        const m = matchActivity(s);
        if (m && m.is_run) {
          const short = s.miles > 2 && m.distance_mi < s.miles * 0.75;
          statusHtml = `<div class="status done">&#10003; ${round1(m.distance_mi)} mi @ ${fmtPace(m.pace_min_per_mi)}${short ? " (short)" : ""}</div>`;
        } else if (m) {
          statusHtml = `<div class="status done">&#10003; ${m.sport}</div>`;
        } else if (past) {
          statusHtml = `<div class="status missed">&times; missed</div>`;
        } else {
          statusHtml = `<div class="status" style="color:var(--muted)">planned</div>`;
        }
      }
      const badges = [];
      (s.flags || []).forEach((f) => {
        if (f === "drinking-day") badges.push(`<span class="badge drink">drink</span>`);
        else if (f === "home-game") badges.push(`<span class="badge game">home game</span>`);
        else if (f.startsWith("travel:")) badges.push(`<span class="badge travel">${f.slice(7)}</span>`);
        else if (f.startsWith("holiday:")) badges.push(`<span class="badge holiday">${f.slice(8)}</span>`);
        else if (f === "class-day" && s.classes && s.classes.length)
          badges.push(`<span class="badge class">class ${s.classes[0].split(" ")[0]}</span>`);
      });
      day.innerHTML = `
        <div class="dow"><span>${s.dow}</span><span>${d.getMonth() + 1}/${d.getDate()}</span></div>
        <div class="ttl">${s.title}</div>
        ${s.miles > 0 ? `<div class="mi">${s.miles} mi</div><div class="pace">${s.pace}</div>` : `<div class="mi" style="color:var(--muted)">-</div>`}
        ${statusHtml}
        <div class="badges">${badges.join("")}</div>`;
      grid.appendChild(day);
    });
    wrap.appendChild(grid);
    if (w.sessions.some((s) => s.purpose && s.kind === "workout")) {
      const wk = w.sessions.find((s) => s.kind === "workout");
      wrap.appendChild(el("div", "legend", `Thursday workout: ${wk.title} - ${wk.purpose}`));
    }
    return wrap;
  }

  const weekHost = $("#weeks");
  weekHost.appendChild(renderWeek(shownWeek, started ? "This week" : "First week (starts " + week1.toDateString() + ")"));
  if (shownWeekIdx < plan.n_weeks) weekHost.appendChild(renderWeek(plan.weeks[shownWeekIdx], "Next week"));

  /* ---------------- charts ---------------- */
  function svg(w, h) {
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", `0 0 ${w} ${h}`);
    s.setAttribute("class", "chart");
    s.setAttribute("preserveAspectRatio", "xMinYMid meet");
    return s;
  }
  function mk(tag, attrs) {
    const n = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  // -- weekly mileage: 10 history weeks + 22 plan weeks
  (function mileageChart() {
    const histStart = mondayOf(addDays(week1, -70));
    const cols = [];
    for (let i = 0; i < 10; i++) {
      const mk_ = addDays(histStart, i * 7);
      cols.push({ key: ymd(mk_), label: `${mk_.getMonth() + 1}/${mk_.getDate()}`, plan: null, act: weekMiles[ymd(mk_)] || 0 });
    }
    plan.weeks.forEach((w) => {
      cols.push({ key: w.start, label: "W" + w.week, plan: w.planned_mileage, act: weekMiles[w.start] || 0 });
    });
    const W = Math.max(760, cols.length * 24), H = 190, P = 28;
    const max = Math.max(50, ...cols.map((c) => Math.max(c.plan || 0, c.act)));
    const s = svg(W, H);
    [0, 0.5, 1].forEach((f) => {
      const y = P + (H - 2 * P) * (1 - f);
      s.appendChild(mk("line", { x1: P, x2: W - 6, y1: y, y2: y, class: "gl" }));
      s.appendChild(mk("text", { x: 2, y: y + 3, ...{} })).textContent = Math.round(max * f);
    });
    const bw = (W - P - 10) / cols.length;
    cols.forEach((c, i) => {
      const x = P + i * bw;
      const scale = (v) => (H - 2 * P) * (v / max);
      if (c.plan != null) s.appendChild(mk("rect", { x: x + 2, y: H - P - scale(c.plan), width: bw - 4, height: scale(c.plan), class: "bar-plan", rx: 2 }));
      if (c.act > 0) s.appendChild(mk("rect", { x: x + (c.plan != null ? bw * 0.28 : 2), y: H - P - scale(c.act), width: bw * (c.plan != null ? 0.44 : 0.6), height: scale(c.act), class: "bar-act", rx: 2 }));
      if (i % 2 === 0) s.appendChild(mk("text", { x: x + bw / 2, y: H - P + 12, "text-anchor": "middle" })).textContent = c.label;
    });
    $("#chart-mileage").appendChild(s);
  })();

  // -- long run progression
  (function longChart() {
    const W = Math.max(720, plan.weeks.length * 30), H = 180, P = 30;
    const max = 27;
    const s = svg(W, H);
    const X = (i) => P + i * ((W - P - 10) / (plan.weeks.length - 1));
    const Y = (v) => P + (H - 2 * P) * (1 - v / max);
    [0, 10, 20, 26.2].forEach((v) => {
      s.appendChild(mk("line", { x1: P, x2: W - 6, y1: Y(v), y2: Y(v), class: "gl" }));
      s.appendChild(mk("text", { x: 2, y: Y(v) + 3 })).textContent = v;
    });
    let dpath = "";
    plan.weeks.forEach((w, i) => {
      dpath += (i ? "L" : "M") + X(i) + " " + Y(w.long_run_mi) + " ";
      if (i % 2 === 0) s.appendChild(mk("text", { x: X(i), y: H - P + 12, "text-anchor": "middle" })).textContent = "W" + w.week;
      const a = weekLongest[w.start];
      if (a) s.appendChild(mk("circle", { cx: X(i), cy: Y(a), r: 3, class: "dot" }));
    });
    s.appendChild(mk("path", { d: dpath, class: "ln-plan" }));
    $("#chart-long").appendChild(s);
  })();

  // -- easy pace trend (weekly avg of easy runs)
  (function paceChart() {
    const buckets = {};
    runs.forEach((a) => {
      const p = a.pace_min_per_mi;
      if (!p || p < 7 || p > 12.5) return;
      if (a.workout_type === 1) return; // races
      const k = ymd(mondayOf(parseD(a.date)));
      (buckets[k] = buckets[k] || []).push(p);
    });
    const keys = Object.keys(buckets).sort().slice(-16);
    if (keys.length < 3) { $("#chart-pace").innerHTML = '<p class="sub">Not enough recent runs yet.</p>'; return; }
    const series = keys.map((k) => ({ k, p: buckets[k].reduce((s, x) => s + x, 0) / buckets[k].length }));
    const W = Math.max(680, series.length * 44), H = 170, P = 34;
    const lo = Math.min(...series.map((s) => s.p)) - 0.2, hi = Math.max(...series.map((s) => s.p)) + 0.2;
    const s = svg(W, H);
    const X = (i) => P + i * ((W - P - 10) / (series.length - 1));
    const Y = (v) => P + (H - 2 * P) * ((v - lo) / (hi - lo));
    [lo, (lo + hi) / 2, hi].forEach((v) => {
      s.appendChild(mk("line", { x1: P, x2: W - 6, y1: Y(v), y2: Y(v), class: "gl" }));
      s.appendChild(mk("text", { x: 2, y: Y(v) + 3 })).textContent = fmtPace(v);
    });
    let dp = "";
    series.forEach((pt, i) => {
      dp += (i ? "L" : "M") + X(i) + " " + Y(pt.p) + " ";
      s.appendChild(mk("circle", { cx: X(i), cy: Y(pt.p), r: 2.5, class: "dot" }));
      if (i % 2 === 0) {
        const d = parseD(pt.k);
        s.appendChild(mk("text", { x: X(i), y: H - P + 12, "text-anchor": "middle" })).textContent = `${d.getMonth() + 1}/${d.getDate()}`;
      }
    });
    s.appendChild(mk("path", { d: dp, class: "ln-act" }));
    $("#chart-pace").appendChild(s);
  })();

  /* ---------------- adherence ---------------- */
  (function adherence() {
    const host = $("#adherence");
    let planned = 0, done = 0, plannedMi = 0, actMi = 0;
    plan.weeks.forEach((w) => {
      const wEnd = addDays(parseD(w.start), 6);
      if (parseD(w.start) > TODAY) return;
      w.sessions.forEach((s) => {
        if (s.kind === "rest" || parseD(s.date) > TODAY) return;
        planned++;
        plannedMi += s.miles;
        const m = matchActivity(s);
        if (m) { done++; if (m.is_run) actMi += m.distance_mi; }
      });
    });
    if (planned === 0) {
      host.innerHTML = `<h2>Adherence</h2><p class="sub">Plan starts ${week1.toDateString()}. Come back after your first sessions and this will track completed vs planned runs, mileage, and your streak.</p>`;
      return;
    }
    const pct = Math.round((done / planned) * 100);
    host.innerHTML = `<h2>Adherence</h2>
      <div class="tiles" style="grid-template-columns:repeat(3,1fr)">
        <div class="tile"><div class="v">${pct}%</div><div class="k">sessions completed</div><div class="d flat">${done} / ${planned}</div></div>
        <div class="tile"><div class="v">${round1(actMi)}</div><div class="k">miles run (plan-to-date)</div><div class="d flat">planned ${round1(plannedMi)}</div></div>
        <div class="tile"><div class="v">${Math.round((actMi / (plannedMi || 1)) * 100)}%</div><div class="k">of planned mileage</div><div class="d flat">since ${week1.toLocaleDateString()}</div></div>
      </div>`;
  })();

  /* ---------------- recent activities ---------------- */
  (function recent() {
    const rows = acts.slice(0, 15).map((a) => `
      <tr>
        <td>${parseD(a.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</td>
        <td>${a.name ? a.name.replace(/</g, "&lt;").slice(0, 42) : a.sport}</td>
        <td>${a.sport}</td>
        <td>${a.distance_mi ? round1(a.distance_mi) : "-"}</td>
        <td>${a.is_run ? fmtPace(a.pace_min_per_mi) : "-"}</td>
        <td>${a.avg_hr ? Math.round(a.avg_hr) : "-"}</td>
        <td>${a.suffer_score != null ? Math.round(a.suffer_score) : "-"}</td>
      </tr>`).join("");
    $("#recent").innerHTML = `<h2>Recent activities</h2>
      <table><thead><tr><th>Date</th><th>Name</th><th>Sport</th><th>mi</th><th>Pace</th><th>Avg HR</th><th>Effort</th></tr></thead>
      <tbody>${rows}</tbody></table>`;
  })();

  $("#foot").textContent =
    `${acts.length} activities loaded - built ${plan.generated_at} - run scripts/strava_sync.py (or wait for the every-30-min launchd job) to refresh.`;
})();
