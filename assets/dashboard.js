/* Miami '27 marathon dashboard  -  reads window.DASHBOARD_DATA from data/data.js */
(function () {
  "use strict";
  const D = window.DASHBOARD_DATA || {};
  const plan = D.plan;
  const acts = (D.activities || []).slice();
  const ath = D.athlete || {};
  const runs = acts.filter((a) => a.is_run && a.distance_mi > 0.3);

  /* ---------- helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const pad = (n) => String(n).padStart(2, "0");
  const parseD = (s) => new Date(String(s).length <= 10 ? s + "T00:00:00" : s);
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const mondayOf = (d) => { const x = new Date(d); return addDays(x, -((x.getDay() + 6) % 7)); };
  const round1 = (x) => Math.round(x * 10) / 10;
  const esc = (s) => String(s || "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));
  const fmtPace = (p) => (p ? `${Math.floor(p)}:${pad(Math.round((p % 1) * 60))}/mi` : "–");
  const mdy = (d) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  const TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);

  /* ---------- daily running fact (rotates at midnight, deterministic) ---------- */
  const RUN_FACTS = [
    "The marathon is 26.2 miles because of the 1908 London Olympics — the course ran from Windsor Castle to the royal box at the stadium. That awkward extra 385 yards became permanent.",
    "At 8:34 per mile your feet strike the ground about 1,450 times each mile — roughly 38,000 footfalls over 26.2, every one landing near 2.5× your body weight.",
    "Frank Shorter's 1972 Olympic Marathon gold is widely credited with starting the American running boom. Before it, road racing was a fringe hobby.",
    "\"The wall\" near mile 20 is real chemistry: your muscles and liver hold only about 90 minutes of hard-running glycogen. Fuel early or pay late.",
    "Humans are elite endurance animals. Persistence hunting — running prey to heat exhaustion over hours — is something almost no other species can do.",
    "Eliud Kipchoge covered the marathon distance in 1:59:40 in 2019 (paced, not record-eligible). That's 4:34 per mile — for 26.2 straight miles.",
    "The three levers of distance running: VO₂max (engine size), lactate threshold (sustainable ceiling), and running economy (fuel efficiency). Easy mileage builds all three.",
    "Most marathon world records are run as negative splits — the second half faster than the first. Starting slow is the fast way.",
    "The Boston Marathon (1897) is the world's oldest annual marathon. It began with 15 runners.",
    "Your body stores roughly 2,000 kcal of glycogen. A marathon burns 2,600–3,000. That gap is why gels exist.",
    "In heat a runner can lose over a liter of sweat per hour. Miami's January humidity means you'll sweat more than the mild temperature suggests.",
    "Percy Beard coached Florida's track team for 25 years and once held the world record in the 120-yard hurdles. The Gators have been fast for a long time.",
    "Grant Holloway — Florida Gator — is a multiple world champion and Olympic gold medalist in the 110m hurdles. Chomp.",
    "The Life Time Miami Marathon sends roughly 20,000 runners over the MacArthur Causeway at dawn, past the cruise port and South Beach. Flat and fast.",
    "Elite marathoners turn over around 180 steps per minute. Higher cadence usually means shorter ground contact and less braking force.",
    "Carbohydrate is the only fuel that burns fast enough to hold marathon pace. Fat powers your easy runs; race day runs on sugar.",
    "The taper works because fitness is built during recovery, not during the workout. Cutting volume 30–50% for 2–3 weeks can add 2–3% to race day.",
    "Zone 2 \"conversational\" running builds mitochondria and capillaries — the cellular machinery that lets you hold pace at mile 22.",
    "Kathrine Switzer ran Boston in 1967 as \"K.V. Switzer\" and was physically attacked mid-race by an official. Women were officially allowed in 1972.",
    "Muscle soreness peaks 24–72 hours after a hard long run. It's micro-damage rebuilding stronger — fuel it and sleep, don't fight it.",
    "The legend: Pheidippides ran about 25 miles from Marathon to Athens in 490 BC to announce a victory, then collapsed and died. Modern shoes help.",
    "Downhill running trashes your quads more than uphill. Eccentric (lengthening-under-load) contractions cause most late-race leg damage — which is why the plan has downhill work.",
    "Every gram of stored glycogen holds about 3 grams of water. Carb-loading can add 2–4 lbs of \"good\" weight you'll burn straight through on race day.",
    "Sweat sodium varies from 200 to 2,000 mg per liter between people. Salt crust on your face after long runs means you're a salty sweater — dose electrolytes accordingly.",
    "The official marathon world record sits at 2:00:35 (Kelvin Kiptum, Chicago 2023). The two-hour barrier is still standing — barely.",
    "A good marathon feels comfortable through 13, controlled through 20, and like a fight for the last 10K. If mile 6 feels hard, the pace is wrong.",
    "Cold-weather training (your December in NYC) lowers heat stress, so the same effort runs faster. When you're back in Florida, run the first 10K by feel, not the watch.",
    "The Gator Chomp debuted around 1981 and now it's the sound of 90,000 people in The Swamp — also a decent cadence metronome at about 90 chomps per minute per arm.",
    "Elite runners spend ~80% of training easy and ~20% hard. Recreational runners who try to make every run count tend to plateau or get injured.",
    "Caffeine is one of the few legal, well-proven aids: 3–6 mg/kg about 45 minutes before hard efforts can lift endurance output 2–4%.",
    "A VO₂max of 55 is roughly the top 15% of men your age. The gap to a 3:45 isn't speed — it's teaching your legs to hold that pace for three and three-quarter hours.",
    "Carbon-plate racing shoes can improve running economy about 4%. Break your race pair in over 2–3 long runs — never debut them on race day.",
    "Drink to thirst with electrolytes, not gallons of plain water. Overdrinking in a marathon causes hyponatremia, which is more dangerous than mild dehydration.",
    "Spyridon Louis, a Greek water carrier, won the first modern Olympic Marathon (Athens 1896) in 2:58:50 — a time that would still qualify for Boston in many age groups.",
    "Sleep is the highest-return recovery tool there is. One night under 6 hours measurably drops next-day power and raises perceived effort — guard it in race week.",
  ];
  const factOfDay = () => RUN_FACTS[Math.floor(TODAY / 86400000) % RUN_FACTS.length];

  const raceDate = parseD(plan.race_date);
  const daysToGo = Math.max(0, Math.round((raceDate - TODAY) / 86400000));
  const week1 = parseD(plan.week1_monday);

  let curWeek = 0;
  plan.weeks.forEach((w) => {
    const s = parseD(w.start);
    if (TODAY >= s && TODAY <= addDays(s, 6)) curWeek = w.week;
  });
  const started = curWeek >= 1;
  const phaseIdx = (started ? plan.weeks[curWeek - 1] : plan.weeks[0]).phase;

  /* weekly actual mileage + longest */
  const weekMiles = {}, weekLong = {};
  runs.forEach((a) => {
    const k = ymd(mondayOf(parseD(a.date)));
    weekMiles[k] = (weekMiles[k] || 0) + a.distance_mi;
    weekLong[k] = Math.max(weekLong[k] || 0, a.distance_mi);
  });
  const milesInRange = (a, b) => runs.filter((r) => { const d = parseD(r.date); return d >= a && d < b; })
    .reduce((s, r) => s + r.distance_mi, 0);

  function matchRun(sess) {
    const t = parseD(sess.date), want = sess.miles;
    const rc = acts.filter((a) => a.is_run && Math.abs(parseD(a.date) - t) <= 86400000);
    if (!rc.length) return null;
    rc.sort((a, b) => Math.abs(a.distance_mi - want) - Math.abs(b.distance_mi - want));
    return rc[0];
  }
  const matchLift = (dateStr) => {
    const t = parseD(dateStr);
    return acts.find((a) => /weight|strength/i.test(a.sport) && Math.abs(parseD(a.date) - t) <= 86400000);
  };

  /* localStorage notes */
  const NKEY = (d) => "mia27:note:" + d;
  const getNote = (d) => { try { return localStorage.getItem(NKEY(d)) || ""; } catch (e) { return ""; } };
  const setNote = (d, v) => { try { v ? localStorage.setItem(NKEY(d), v) : localStorage.removeItem(NKEY(d)); } catch (e) {} };

  /* ============================================================
     HERO  -  Miami sunset skyline
     ============================================================ */
  function heroSVG() {
    const palm = (x, s, flip) => `
      <g transform="translate(${x},300) scale(${s}${flip ? ",1" : ""})">
        <path d="M0,0 C-3,-40 -6,-70 -14,-96" stroke="#05070F" stroke-width="6" fill="none" stroke-linecap="round"/>
        <g stroke="#05070F" stroke-width="5" fill="none" stroke-linecap="round" transform="translate(-14,-96)">
          <path d="M0,0 C-18,-6 -34,-2 -46,10"/>
          <path d="M0,0 C-10,-16 -8,-32 2,-44"/>
          <path d="M0,0 C10,-14 26,-16 42,-8"/>
          <path d="M0,0 C18,-2 30,6 40,18"/>
          <path d="M0,0 C-6,8 -16,16 -30,20"/>
        </g>
      </g>`;
    const bld = (x, w, h, deco) => deco
      ? `<path d="M${x},360 L${x},${360 - h} L${x + w / 2 - 6},${360 - h} L${x + w / 2 - 6},${360 - h - 14} L${x + w / 2 + 6},${360 - h - 14} L${x + w / 2 + 6},${360 - h} L${x + w},${360 - h} L${x + w},360 Z" fill="#05070F"/>`
      : `<rect x="${x}" y="${360 - h}" width="${w}" height="${h}" fill="#05070F"/>`;
    return `
    <svg class="sky" viewBox="0 0 1160 360" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Miami skyline at sunset">
      <defs>
        <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#2A1856"/>
          <stop offset="0.42" stop-color="#7A2E8F"/>
          <stop offset="0.66" stop-color="#FF5E8A"/>
          <stop offset="0.84" stop-color="#FF9A4B"/>
          <stop offset="1" stop-color="#FFC24B"/>
        </linearGradient>
        <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#FFE7B0"/><stop offset="1" stop-color="#FF9A4B" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1160" height="360" fill="url(#sun)"/>
      <circle cx="580" cy="250" r="150" fill="url(#glow)"/>
      <circle cx="580" cy="250" r="66" fill="#FFD98A"/>
      <g opacity="0.9">
        <rect x="0" y="250" width="1160" height="4" fill="#FFB86B" opacity="0.5"/>
        <rect x="0" y="262" width="1160" height="3" fill="#FF7FA5" opacity="0.4"/>
        <rect x="0" y="273" width="1160" height="2" fill="#FF7FA5" opacity="0.3"/>
      </g>
      <g>
        ${bld(60, 40, 120)}${bld(104, 26, 170, 1)}${bld(134, 46, 96)}${bld(300, 34, 140)}
        ${bld(338, 22, 210, 1)}${bld(364, 40, 120)}${bld(720, 40, 150)}${bld(764, 24, 230, 1)}
        ${bld(792, 48, 128)}${bld(980, 34, 118)}${bld(1016, 26, 176, 1)}${bld(1046, 60, 92)}
        ${bld(520, 30, 96)}${bld(210, 30, 80)}${bld(880, 30, 104)}
      </g>
      ${palm(120, 1.15)} ${palm(1050, 1.3, true)}
      <path d="M0,320 Q290,300 580,320 T1160,320 L1160,360 L0,360 Z" fill="#05070F"/>
      <g transform="translate(806,300)" fill="#05070F" opacity="0.92" aria-hidden="true">
        <path d="M-70,6 Q-40,-8 10,-6 Q60,-4 96,4 Q120,9 96,14 Q40,20 -10,17 Q-52,15 -70,6 Z"/>
        <path d="M96,4 Q116,-2 132,-6 Q126,6 132,16 Q116,12 96,14 Z"/>
        <circle cx="86" cy="2" r="3" fill="#FFC24B"/>
        <path d="M-70,6 Q-96,2 -116,10 Q-96,12 -70,12 Z"/>
        <g stroke="#05070F" stroke-width="5" stroke-linecap="round">
          <path d="M-30,16 l-6,12"/><path d="M0,17 l4,12"/><path d="M44,15 l-4,12"/><path d="M74,12 l6,11"/>
        </g>
        <path d="M-16,-6 l6,-7 6,7 Z M14,-6 l6,-8 6,8 Z M44,-3 l5,-7 5,7 Z"/>
      </g>
    </svg>`;
  }

  /* ============================================================
     TAB 1  -  RACE
     ============================================================ */
  function renderRace() {
    const el = $("#tab-race");
    const w = started ? plan.weeks[curWeek - 1] : plan.weeks[0];

    // this-week volume
    const wStart = parseD(w.start);
    const actMi = milesInRange(wStart, addDays(wStart, 7));
    const pct = Math.min(140, Math.round((actMi / w.planned_mileage) * 100));
    const liftDone = w.sessions.filter((s) => s.lift && matchLift(s.date)).length;
    const liftPlan = w.sessions.filter((s) => s.lift).length;

    const last7 = milesInRange(addDays(TODAY, -7), addDays(TODAY, 1));
    const prev7 = milesInRange(addDays(TODAY, -14), addDays(TODAY, -7));
    const d7 = last7 - prev7;

    // next session (first non-rest session dated today or later)
    let next = null;
    outer:
    for (const wk of plan.weeks) {
      for (const s of wk.sessions) {
        if (s.kind === "rest") continue;
        if (parseD(s.date) >= TODAY) { next = s; break outer; }
      }
    }

    const sp = ath.goal_splits || {};
    const phases = ["Base", "Build", "Peak", "Taper"];
    const phaseBlurb = { Base: "build the engine", Build: "add race-pace work", Peak: "biggest weeks — protect them", Taper: "sharpen &amp; rest" };

    el.innerHTML = `
      <div class="hero">
        ${heroSVG()}
        <div class="overlay">
          <div class="kicker">&#128010; Gator Nation &middot; senior year &middot; the final go</div>
          <div class="big-count">${daysToGo}</div>
          <div class="count-label">days to the start line</div>
          <div class="sub">${raceDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })} &middot; 6:00 AM gun &middot; goal ${plan.goal_time}</div>
        </div>
      </div>

      <div class="factday">
        <div class="factday-tag">&#128010; Fact of the day</div>
        <p>${factOfDay()}</p>
      </div>

      <div class="grid g4" style="margin-top:18px">
        <div class="panel kpi">
          <div class="v accent">${started ? "W" + curWeek : "Prep"}<small style="font-size:.5em;color:var(--muted)"> / ${plan.n_weeks}</small></div>
          <div class="k">Training week</div>
          <div class="phasebar">${plan.weeks.map((x) => `<i class="${x.week === curWeek ? "on" : x.week < curWeek ? "past" : ""}"></i>`).join("")}</div>
          <div class="phase-legend">${phases.map((p) => `<span${p === w.phase ? ' style="color:var(--gator-orange)"' : ""}>${p}</span>`).join("")}</div>
        </div>
        <div class="panel kpi">
          <div class="v">${plan.goal_time}</div>
          <div class="k">Goal finish &middot; ${plan.goal_pace}</div>
          <div class="foot">Every mile at <b class="accent">8:34</b>. 26.2 of them. No hero splits in the first 10.</div>
        </div>
        <div class="panel kpi">
          <div class="v">${Math.ceil(daysToGo / 7)}<small style="font-size:.5em;color:var(--muted)"> wk</small></div>
          <div class="k">Weeks to the line</div>
          <div class="foot">${w.phase} block &mdash; ${w.phase === "Base" ? "build the engine" : w.phase === "Build" ? "add race-pace work" : w.phase === "Peak" ? "biggest weeks, protect them" : "sharpen &amp; rest"}</div>
        </div>
        <div class="panel kpi">
          <div class="v">${ath.vo2max || "–"}<small style="font-size:.5em;color:var(--muted)"> VO&#8322;max</small></div>
          <div class="k">Garmin fitness</div>
          <div class="foot">Predicts <b>${(ath.race_predictions || {}).marathon || "–"}</b> &mdash; goal is ${plan.goal_time}, ~2 min faster.</div>
        </div>
      </div>

      <div class="grid g2">
        <div class="panel">
          <div class="eyebrow">This week&rsquo;s volume</div>
          <div class="meter">
            <div class="track"><div class="fill ${pct > 100 ? "over" : ""}" style="width:${Math.min(100, pct)}%"></div></div>
            <div class="labels"><span><b>${round1(actMi)} mi</b> logged</span><span>target <b>${w.planned_mileage} mi</b> &middot; ${pct}%</span></div>
          </div>
          <div class="meter" style="margin-top:16px">
            <div class="track"><div class="fill" style="width:${liftPlan ? Math.min(100, (liftDone / liftPlan) * 100) : 0}%"></div></div>
            <div class="labels"><span><b>${liftDone} / ${liftPlan}</b> lifts</span><span>${liftPlan ? "Legs&middot;Push&middot;Pull&middot;Chest&#47;Back&middot;Sh&#47;Arms" : ""}</span></div>
          </div>
          <div class="foot" style="margin-top:14px;font-size:12.5px;color:var(--muted)">
            Last 7 days: <b style="color:var(--text)">${round1(last7)} mi</b>
            <span class="${d7 > 0.5 ? "up" : d7 < -0.5 ? "down" : "flat"}">(${d7 > 0 ? "+" : ""}${round1(d7)} vs prior week)</span>
          </div>
          ${next ? `<div class="callout" style="border-color:var(--gator-orange);background:rgba(250,70,22,.08);color:#FFB59D">
            Next up &mdash; <b>${esc(next.dow)} ${mdy(parseD(next.date))}: ${esc(next.type_label)} ${next.miles} mi</b>. ${esc(next.zone)}</div>` : ""}
        </div>

        <div class="panel">
          <div class="eyebrow">What 3:45 looks like &mdash; clock time at each checkpoint</div>
          <table class="splits">
            <tr><td>5K</td><td>${sp["5K"] || "26:35"}</td></tr>
            <tr><td>10K</td><td>${sp["10K"] || "53:10"}</td></tr>
            <tr><td>Half &middot; 13.1 mi</td><td>${sp.half || "1:52:20"}</td></tr>
            <tr><td>30K &middot; 18.6 mi</td><td>${sp["30K"] || "2:39:30"}</td></tr>
            <tr><td>20 mi</td><td>${sp["20mi"] || "2:51:20"}</td></tr>
            <tr><td>Finish &middot; 26.2 mi</td><td>${sp.finish || "3:45:00"}</td></tr>
          </table>
          <div class="foot" style="margin-top:12px">Halfway at <b class="accent">1:52:20 or a hair slower</b>, then hold. The race starts at mile 20 &mdash; that's what the 20-milers are for.</div>
        </div>
      </div>
    `;
  }

  /* ============================================================
     TAB 2  -  THIS WEEK
     ============================================================ */
  let viewWeek = started ? curWeek : 1;

  function renderWeek() {
    const el = $("#tab-week");
    const w = plan.weeks[viewWeek - 1];
    const wStart = parseD(w.start), wEnd = addDays(wStart, 6);
    const actMi = milesInRange(wStart, addDays(wStart, 7));
    const liftDone = w.sessions.filter((s) => s.lift && matchLift(s.date)).length;
    const liftPlan = w.sessions.filter((s) => s.lift).length;

    const rows = w.sessions.map((s) => {
      const d = parseD(s.date);
      const isToday = ymd(d) === ymd(TODAY);
      const past = d < TODAY;
      const isRest = s.kind === "rest";

      let logged = `<span class="logged plan">planned</span>`;
      if (isRest && s.lift) {
        logged = matchLift(s.date)
          ? `<span class="logged done">&#10003; lifted</span>`
          : past ? `<span class="logged missed">&times; no lift logged</span>`
          : `<span class="logged plan">lift planned</span>`;
      } else if (isRest) logged = `<span class="logged plan">rest day</span>`;
      else {
        const m = matchRun(s);
        if (m && m.is_run) {
          const short = s.miles > 3 && m.distance_mi < s.miles * 0.75;
          logged = `<span class="logged done">&#10003; ${round1(m.distance_mi)} mi @ ${fmtPace(m.pace_min_per_mi)}</span>` +
            (m.avg_hr ? ` <span style="color:var(--muted)">&middot; ${Math.round(m.avg_hr)} bpm</span>` : "") +
            (short ? ` <span style="color:var(--bad)">(short)</span>` : "");
        } else if (m) {
          logged = `<span class="logged done">&#10003; ${esc(m.sport)}</span>`;
        } else if (past) {
          logged = `<span class="logged missed">&times; not logged</span>`;
        }
      }

      const badges = (s.flags || []).map((f) => {
        if (f === "drinking-day") return `<span class="b drink">drink</span>`;
        if (f === "home-game") return `<span class="b game">home game</span>`;
        if (f.startsWith("travel:")) return `<span class="b travel">${esc(f.slice(7))}</span>`;
        if (f.startsWith("holiday:")) return `<span class="b holiday">${esc(f.slice(8))}</span>`;
        if (f === "class-day" && s.classes && s.classes.length) return `<span class="b class">class ${esc(s.classes[0].split(" ")[0])}</span>`;
        return "";
      }).join("");

      const lift = s.lift ? `<div class="lift">&#127947; ${esc(s.lift.name)}${matchLift(s.date) ? " &#10003;" : ""}${s.lift.note ? `<span class="n">${esc(s.lift.note)}</span>` : ""}</div>` : "";
      const note = getNote(s.date);

      return `<div class="dayrow ${isToday ? "today" : ""} ${isRest && !s.lift ? "rest" : ""}">
        <div class="dcol">
          <div class="dow">${esc(s.dow)}</div><div class="date">${mdy(d)}</div>
          <span class="tl ${s.kind}">${s.lift && isRest ? "Lift day" : esc(s.type_label)}</span>
        </div>
        <div class="mcol">
          ${s.miles > 0 ? `<div class="dist">${s.miles} <small>mi</small></div>` : `<div class="dist" style="color:var(--muted)">&ndash;</div>`}
          <div class="struct">${esc(s.title)}</div>
          <div class="meta">
            ${s.miles > 0 ? `<span><b>Pace</b> ${esc(s.pace)}</span>` : ""}
            ${s.zone ? `<span><b>Effort</b> ${esc(s.zone)}</span>` : ""}
          </div>
          ${lift}
          <div class="badges">${badges}</div>
        </div>
        <div class="lcol">
          <div>${logged}</div>
          ${s.fuel ? `<div class="fuel">&#9889; ${esc(s.fuel)}</div>` : ""}
          <div class="notelbl">My notes &middot; fueling</div>
          <textarea data-date="${s.date}" placeholder="What you took, how it felt, adjustments…">${esc(note)}</textarea>
        </div>
      </div>`;
    }).join("");

    el.innerHTML = `
      <div class="panel">
        <div class="weeknav">
          <button id="wprev" ${viewWeek <= 1 ? "disabled" : ""}>&#8249;</button>
          <button id="wnext" ${viewWeek >= plan.n_weeks ? "disabled" : ""}>&#8250;</button>
          <div class="now">
            <div class="t">Week ${w.week} <span style="color:var(--muted);font-weight:500">of ${plan.n_weeks}</span> &middot; ${w.phase}</div>
            <div class="d">${mdy(wStart)} &ndash; ${mdy(wEnd)} &nbsp;|&nbsp; run <b style="color:var(--text)">${round1(actMi)} / ${w.planned_mileage} mi</b> &nbsp; lift <b style="color:var(--text)">${liftDone} / ${liftPlan}</b></div>
          </div>
          ${viewWeek !== curWeek && curWeek ? `<button id="wtoday" style="width:auto;padding:0 14px;font-size:12px">Today</button>` : ""}
        </div>
        ${(w.notes || []).map((n) => `<div class="callout">${esc(n)}</div>`).join("")}
        ${plan.lifting ? `<div class="callout" style="border-color:var(--violet);background:rgba(108,75,216,.08);color:#C9B6FF">&#127947; Lifting split: ${Object.entries(plan.lifting.split).map(([d, n]) => `${d} ${n}`).join(" &middot; ")}. ${esc(plan.lifting.rule)}</div>` : ""}
        <div style="margin-top:6px">${rows}</div>
      </div>
      <div class="factday">
        <div class="factday-tag">&#128010; Fact of the day</div>
        <p>${factOfDay()}</p>
      </div>
    `;

    $("#wprev").onclick = () => { if (viewWeek > 1) { viewWeek--; renderWeek(); } };
    $("#wnext").onclick = () => { if (viewWeek < plan.n_weeks) { viewWeek++; renderWeek(); } };
    const tb = $("#wtoday"); if (tb) tb.onclick = () => { viewWeek = curWeek; renderWeek(); };
    el.querySelectorAll("textarea[data-date]").forEach((t) => {
      t.addEventListener("input", () => setNote(t.dataset.date, t.value));
    });
  }

  /* ============================================================
     TAB 3  -  PROGRESSION
     ============================================================ */
  function svg(w, h) {
    return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="ggrad" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stop-color="#0021A5"/><stop offset="0.55" stop-color="#FA4616"/><stop offset="1" stop-color="#FFC24B"/>
      </linearGradient></defs>`;
  }

  function mileageChart() {
    const histStart = mondayOf(addDays(week1, -56));
    const cols = [];
    for (let i = 0; i < 8; i++) {
      const m = addDays(histStart, i * 7);
      cols.push({ label: `${m.getMonth() + 1}/${m.getDate()}`, plan: null, act: weekMiles[ymd(m)] || 0 });
    }
    plan.weeks.forEach((w) => cols.push({ label: "W" + w.week, plan: w.planned_mileage, act: weekMiles[w.start] || 0, phase: w.phase }));
    const W = Math.max(820, cols.length * 24), H = 220, P = 30;
    const max = Math.max(50, ...cols.map((c) => Math.max(c.plan || 0, c.act)));
    const bw = (W - P - 12) / cols.length;
    const sc = (v) => (H - 2 * P) * (v / max);
    let s = svg(W, H);
    [0, .25, .5, .75, 1].forEach((f) => {
      const y = H - P - sc(max * f);
      s += `<line class="gl" x1="${P}" y1="${y}" x2="${W - 6}" y2="${y}"/><text x="2" y="${y + 3}">${Math.round(max * f)}</text>`;
    });
    cols.forEach((c, i) => {
      const x = P + i * bw;
      if (c.plan != null) s += `<rect class="bar-plan" x="${x + 2}" y="${H - P - sc(c.plan)}" width="${bw - 4}" height="${sc(c.plan)}" rx="2"/>`;
      if (c.act > 0) s += `<rect class="bar-act" x="${x + (c.plan != null ? bw * .28 : 2)}" y="${H - P - sc(c.act)}" width="${bw * (c.plan != null ? .44 : .6)}" height="${sc(c.act)}" rx="2"/>`;
      if (i % 2 === 0) s += `<text x="${x + bw / 2}" y="${H - P + 13}" text-anchor="middle">${c.label}</text>`;
    });
    return s + "</svg>";
  }

  // week -> [label, vertical placement: "up" | "down"]
  const MILESTONES = {
    2: ["first double-digit", "down"],
    8: ["first 16-miler", "up"],
    11: ["18 · race rehearsal", "down"],
    14: ["first 20 — you can finish now", "up"],
    16: ["20 in the NYC cold", "down"],
    19: ["taper begins", "up"],
    22: ["26.2 · MIAMI", "up"],
  };
  function longChart() {
    const W = Math.max(760, plan.weeks.length * 34), H = 260, P = 46, max = 28;
    const X = (i) => P + i * ((W - P - 14) / (plan.weeks.length - 1));
    const Y = (v) => P + (H - 2 * P) * (1 - v / max);
    let s = svg(W, H);
    [0, 10, 20, 26.2].forEach((v) => { s += `<line class="gl" x1="${P}" y1="${Y(v)}" x2="${W - 6}" y2="${Y(v)}"/><text x="4" y="${Y(v) + 3}">${v}</text>`; });
    let dp = "";
    plan.weeks.forEach((w, i) => {
      dp += (i ? "L" : "M") + X(i) + " " + Y(w.long_run_mi) + " ";
      if (i % 2 === 0) s += `<text x="${X(i)}" y="${H - P + 15}" text-anchor="middle">W${w.week}</text>`;
      const a = weekLong[w.start];
      if (a) s += `<circle class="dot" cx="${X(i)}" cy="${Y(a)}" r="3"/>`;
    });
    s += `<path class="ln-plan" d="${dp}"/>`;
    Object.entries(MILESTONES).forEach(([wk, [label, place]]) => {
      const i = +wk - 1, x = X(i), y = Y(plan.weeks[i].long_run_mi);
      const last = i > plan.weeks.length - 4;
      const ly = place === "up" ? y - 16 : y + 24;
      const anchor = last ? "end" : "middle";
      const lx = last ? x - 6 : x;
      s += `<line x1="${x}" y1="${y}" x2="${lx}" y2="${ly + (place === "up" ? 5 : -12)}" stroke="#FFC24B" stroke-width="1" opacity="0.5"/>
        <circle class="mile" cx="${x}" cy="${y}" r="4.5"/>
        <text class="mlabel" x="${lx}" y="${ly}" text-anchor="${anchor}">${label}</text>`;
    });
    return s + "</svg>";
  }

  const FUEL = [
    ["Carbs during", "30–60 g per hour once you're past ~75 min. Work up toward 60–90 g/hr for the race using mixed glucose + fructose gels — the gut is trainable, so practice it on every long run."],
    ["Fluid", "16–24 oz per hour, more in Miami humidity. Weigh yourself before and after a long run: drink 16–24 oz for every pound lost."],
    ["Sodium", "300–700 mg per hour when it's warm and you're sweating hard. Race morning in Miami is ~72°F and humid at the 6 AM gun — electrolytes matter more than you think."],
    ["Before a long run", "1–4 g carb per kg body weight, 1–4 hours out. Keep fiber and fat low. A bagel + banana + honey 2 hours before is plenty."],
    ["After", "20–40 g protein plus carbs within 60 minutes. Chocolate milk genuinely works. This is when adaptation happens."],
    ["Race day rule", "Nothing new. Every gel flavor, every bottle, the exact breakfast — rehearse it on your 16–20 milers so race morning is autopilot."],
    ["Caffeine", "3–6 mg per kg about 45 min before hard efforts and the race can lift performance a few percent. Test your stomach's opinion first."],
    ["Cold-to-heat", "You'll train the last 3 weeks in NYC cold, then race warm. Expect Miami to feel harder at the same pace — run the first 10K by effort, let the pace come to you."],
  ];

  const FACTS = [
    ["55", "Your Garmin VO₂max. That's roughly the top ~15% for men your age — the speed is there; the plan is about durability over 26.2."],
    ["~90", "Minutes of hard running your muscle + liver glycogen can cover. That's \"the wall\" — and exactly why fueling from mile 4, not mile 16, is non-negotiable."],
    ["80%", "Of your weekly miles should feel genuinely easy (Zone 2). Running economy is built by consistent easy volume, not by hammering every run."],
    ["168", "Your average cadence (steps/min). Nudging toward 175–180 with quick, light steps shortens ground contact and cuts impact — do it in the strides."],
    ["10–14", "Days to heat-acclimate. You won't have that after NYC, so on race week hydrate aggressively and pre-cool (cold towel, ice) before the start."],
    ["2–3 mm", "How much your arches flatten and legs lengthen over a marathon as muscles fatigue — shoes half a size up for long runs and race day."],
  ];

  const EX = [
    ["Couch stretch (hip flexors)", "2 × 45s / side, after every run",
      "Rear shin flat against a wall or couch, front foot planted, squeeze the back glute and stand tall. Opens the hip flexors that shorten from running and sitting in class.",
      `<circle cx="34" cy="26" r="7" fill="none" stroke="#FA4616" stroke-width="3"/>
       <path d="M34 33 L40 55 L58 58" fill="none" stroke="#FA4616" stroke-width="3" stroke-linecap="round"/>
       <path d="M40 55 L26 74 L14 82" fill="none" stroke="#FA4616" stroke-width="3" stroke-linecap="round"/>
       <line x1="12" y1="14" x2="12" y2="86" stroke="#8B96B8" stroke-width="3"/>
       <path d="M14 82 Q10 70 12 60" fill="none" stroke="#FA4616" stroke-width="3" stroke-linecap="round"/>`],
    ["Calf wall stretch (gastroc + soleus)", "30s straight + 30s bent knee / side",
      "Hands on wall, one leg back with heel down and knee straight (gastroc), then bend that knee slightly (soleus). Achilles and calf take the biggest load in a marathon.",
      `<line x1="80" y1="12" x2="80" y2="86" stroke="#8B96B8" stroke-width="3"/>
       <circle cx="44" cy="24" r="7" fill="none" stroke="#FA4616" stroke-width="3"/>
       <path d="M44 31 L50 52" stroke="#FA4616" stroke-width="3" stroke-linecap="round"/>
       <path d="M50 52 L74 40" stroke="#FA4616" stroke-width="3" stroke-linecap="round"/>
       <path d="M50 52 L30 78 L20 82" fill="none" stroke="#FA4616" stroke-width="3" stroke-linecap="round"/>
       <path d="M50 52 L58 80 L70 82" fill="none" stroke="#FA4616" stroke-width="3" stroke-linecap="round"/>`],
    ["Supine hamstring (strap)", "2 × 30s / side",
      "On your back, loop a strap or belt around the foot and raise a straight leg until you feel a gentle stretch behind the thigh. Keep the other leg down. Tight hamstrings tug on the pelvis and low back.",
      `<path d="M12 70 L74 70" stroke="#8B96B8" stroke-width="3"/>
       <circle cx="20" cy="62" r="7" fill="none" stroke="#FA4616" stroke-width="3"/>
       <path d="M27 64 L52 66" stroke="#FA4616" stroke-width="3" stroke-linecap="round"/>
       <path d="M52 66 L64 30" stroke="#FA4616" stroke-width="3" stroke-linecap="round"/>
       <path d="M52 66 L78 66" stroke="#FA4616" stroke-width="3" stroke-linecap="round"/>
       <path d="M64 30 Q54 40 52 66" fill="none" stroke="#17D1C6" stroke-width="2" stroke-dasharray="3 3"/>`],
    ["Figure-4 glute / piriformis", "2 × 40s / side",
      "On your back, cross one ankle over the opposite knee and pull that thigh toward your chest. Deep-hip and glute release — this is often what's really behind \"tight IT band.\"",
      `<path d="M10 74 L72 74" stroke="#8B96B8" stroke-width="3"/>
       <circle cx="18" cy="66" r="7" fill="none" stroke="#FA4616" stroke-width="3"/>
       <path d="M25 68 L44 62" stroke="#FA4616" stroke-width="3" stroke-linecap="round"/>
       <path d="M44 62 L52 44 L44 40" fill="none" stroke="#FA4616" stroke-width="3" stroke-linecap="round"/>
       <path d="M44 62 L64 50" stroke="#FA4616" stroke-width="3" stroke-linecap="round"/>
       <path d="M52 44 L40 30" stroke="#FA4616" stroke-width="3" stroke-linecap="round"/>`],
    ["Standing quad stretch", "2 × 30s / side",
      "Heel to glute, knees together, push the hip forward. Hold a wall for balance. Quads and knees do the braking on every downhill and every mile after 20.",
      `<circle cx="40" cy="20" r="7" fill="none" stroke="#FA4616" stroke-width="3"/>
       <path d="M40 27 L40 56" stroke="#FA4616" stroke-width="3" stroke-linecap="round"/>
       <path d="M40 56 L30 82" stroke="#FA4616" stroke-width="3" stroke-linecap="round"/>
       <path d="M40 56 Q58 58 54 40 Q52 30 42 34" fill="none" stroke="#FA4616" stroke-width="3" stroke-linecap="round"/>
       <line x1="80" y1="10" x2="80" y2="86" stroke="#8B96B8" stroke-width="3"/>
       <path d="M40 40 L74 40" stroke="#FA4616" stroke-width="3" stroke-linecap="round"/>`],
    ["Foam roll: quads, IT band, calves", "60–90s / area, slow",
      "Roll each area slowly, pausing 20–30s on tender spots and breathing. Best right after runs and on rest days — keeps tissue supple as mileage climbs.",
      `<ellipse cx="30" cy="64" rx="12" ry="12" fill="none" stroke="#8B96B8" stroke-width="3"/>
       <path d="M18 64 L86 64" stroke="#8B96B8" stroke-width="3"/>
       <circle cx="74" cy="34" r="7" fill="none" stroke="#FA4616" stroke-width="3"/>
       <path d="M70 40 L44 58" stroke="#FA4616" stroke-width="3" stroke-linecap="round"/>
       <path d="M44 58 L24 60" stroke="#FA4616" stroke-width="3" stroke-linecap="round"/>
       <path d="M70 40 L64 20" stroke="#FA4616" stroke-width="3" stroke-linecap="round"/>`],
  ];

  function renderProgress() {
    const el = $("#tab-progress");
    el.innerHTML = `
      <div class="panel">
        <div class="eyebrow">Weekly mileage trajectory &mdash; plan vs. what you logged</div>
        <div class="chartbox">${mileageChart()}</div>
        <div class="legend"><span><i style="background:#2A3352"></i>planned</span><span><i style="background:linear-gradient(0deg,#0021A5,#FA4616)"></i>actual (Strava)</span></div>
      </div>

      <div class="panel">
        <div class="eyebrow">Long-run ramp &amp; milestones</div>
        <div class="chartbox">${longChart()}</div>
        <div class="legend"><span><i style="background:#4A5680"></i>planned long run</span><span><i style="background:#FA4616"></i>logged</span><span><i style="background:#FFC24B"></i>milestone</span></div>
      </div>

      <div class="panel">
        <div class="eyebrow">Fueling &amp; hydration &mdash; you're asking a lot of your body</div>
        <div class="grid g2">
          ${FUEL.map(([h, p]) => `<div class="fcard"><h4>${h}</h4><p>${p}</p></div>`).join("")}
        </div>
      </div>

      <div class="panel">
        <div class="eyebrow">Recovery &amp; mobility &mdash; do these, not someday</div>
        <div class="exgrid">
          ${EX.map(([name, dose, body, art]) => `<div class="ex">
            <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">${art}</svg>
            <div><h4>${name}</h4><div class="dose">${dose}</div><p>${body}</p></div>
          </div>`).join("")}
        </div>
      </div>

      <div class="panel">
        <div class="eyebrow">The why &mdash; endurance facts that change how you train</div>
        ${FACTS.map(([n, t]) => `<div class="fact"><span class="n">${n}</span><span>${t}</span></div>`).join("")}
      </div>
    `;
  }

  /* ============================================================
     tab routing
     ============================================================ */
  const RENDER = { race: renderRace, week: renderWeek, progress: renderProgress };
  const rendered = {};
  function show(tab) {
    if (!RENDER[tab]) tab = "race";
    document.querySelectorAll("nav.tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
    document.querySelectorAll(".tab").forEach((s) => s.classList.toggle("active", s.id === "tab-" + tab));
    if (!rendered[tab]) { RENDER[tab](); rendered[tab] = true; }
    if (tab === "week") renderWeek(); // always refresh (week nav state)
    try { history.replaceState(null, "", "#" + tab); } catch (e) {}
    window.scrollTo(0, 0);
  }
  document.querySelectorAll("nav.tabs button").forEach((b) => b.onclick = () => show(b.dataset.tab));
  window.addEventListener("hashchange", () => show(location.hash.slice(1)));

  $("#sync").textContent = D.synced_at ? "synced " + new Date(D.synced_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
  $("#foot").innerHTML = `${acts.length} activities &middot; refreshes hourly from Strava &middot; notes saved on this device only<br><b style="color:var(--gator-orange)">Go Gators</b> &#128010; &mdash; Miami, 1&#47;31&#47;27`;

  show((location.hash.slice(1)) || "race");
})();
