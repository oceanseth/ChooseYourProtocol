# ChooseYourProtocol — Bay Builders Hackathon Demo Scenarios

**Venue:** AWS Builder Loft · **Format:** 3-minute live pitch · **Goal:** judges download the app to track their own goal *today*.

Two scenarios. One shows change the eye can't measure. One shows the dots no single user could connect. Both end on the human-in-the-loop moment that makes the community real.

---

## DEMO 1 — High-Visual Consumer Track: Hairline Regrowth

### 1. The Hook
> "Maya has spent $600 on hair serums and can't tell if any of them work — because a mirror can't count follicles, and every 'before/after' photo lies about the lighting."

### 2. The Synthetic Cohort — `coh_aga_crown_v2`
| Name | Age | Goal | Protocol |
|---|---|---|---|
| **Maya R.** | 31 | Reverse crown thinning after postpartum shed | Weekly 10x macro crown photo (fixed 1cm² grid decal), daily minoxidil, monthly ferritin |
| **Devon K.** | 27 | Stop early hairline recession | Weekly hairline macro, daily microneedling, DHT lab at day 0 / day 90 |
| **Priya S.** | 38 | Regrow density after telogen effluvium | Weekly crown macro, daily shedding-severity slider, monthly Vitamin D |

### 3. The 30-Day Before & After
- **Day 1 — The Start:** Maya logs her first standardized macro photo → CV pipeline returns baseline **follicle density 148 hairs/cm²**, ferritin 41 ng/mL, shedding slider 6/10. Photo is auto-normalized for lighting and framing against the grid decal.
- **Day 15 — The Anomaly:** Across the cohort, the agent flags a synchronized **shedding-slider spike (6→8 in 5 of 8 members)** — but macro photos show density *holding steady*, not dropping. Perceived loss ≠ actual loss.
- **Day 30 — The Evolution / "Aha!":** The long-running AGA problem-space agent overlays the shedding spike against photo timestamps and finds the spike tracks **shed-phase regrowth** — the new terminal hairs are pushing out old telogen hairs. Density is up **148 → 159 hairs/cm²**, invisible to the naked eye. Automated protocol upgrade: adds a **"shed-phase context card"** to every cohort member so the next spike reads as progress, not failure — and freezes variables so nobody quits a working regimen out of panic.

### 4. The Live Phone Demo Action
Presenter opens Maya's profile, taps the **Density Timeline** card, and drags the before/after slider: the CV overlay lights up **11 newly detected follicles** the human eye missed. Then taps the amber **Accountability Gate card** — "Shedding felt worse. Your density went up. Here's why." — showing the human-in-the-loop moment live on device.

---

## DEMO 2 — Quantified High-Stakes Track: Post-Chemo Inflammation & Immune Recovery

### 1. The Hook
> "Eight months after chemo, Robert's oncologist sees him every 3 months — but his inflammation swings weekly, and no consumer app connects his blood work to the days he actually felt wrecked."

### 2. The Synthetic Cohort — `coh_survivor_inflam_v1`
| Name | Age | Goal | Protocol |
|---|---|---|---|
| **Robert M.** | 58 | Track immune recovery post-chemo (colorectal) | Monthly CBC + hs-CRP, weekly CD4 T-cell count, daily fatigue slider, wearable RHR/HRV |
| **Lena T.** | 44 | Manage post-treatment inflammation (breast) | Bi-weekly hs-CRP, daily joint-pain slider, DEXA visceral-fat ratio quarterly |
| **Sam O.** | 61 | Rebuild endurance during remission | Weekly hs-CRP, daily HRV via wearable, monthly ferritin |

### 3. The 30-Day Before & After
- **Day 1 — The Start:** Robert uploads a lab PDF → parser extracts **hs-CRP 5.4 mg/L, CD4 310 cells/µL**; wearable API syncs RHR 61 bpm / HRV 38 ms; daily fatigue slider 4/10.
- **Day 15 — The Anomaly:** The agent detects a **joint-pain + hs-CRP spike across 6 of 8 cohort members** in the same 72-hour window — a cross-cohort inflammation event with no obvious protocol cause.
- **Day 30 — The Evolution / "Aha!":** The problem-space agent cross-references the spike window against **regional barometric-pressure data** and finds the flare tracks a **sharp atmospheric-pressure drop over the cohort's shared metro area**, not diet or activity. hs-CRP has since settled **5.4 → 2.1 mg/L**. Automated protocol upgrade: adds a **weather-pressure covariate** to every survivor's inflammation model so environmental flares stop getting misattributed to habits — and prompts each member to note it before changing any variable.

### 4. The Live Phone Demo Action
Presenter opens Robert's **Inflammation Dashboard**, points to the hs-CRP line dropping 5.4 → 2.1, then taps the **Cohort Insight banner**: "6 of 8 in your group flared the same 3 days — atmospheric pressure, not you." Then the **Accountability Gate**: "Hold variables. Log this flare. Review with your specialist." — showing the app refuses to diagnose and hands the trend to a human.

---

## Presentation notes (say these out loud)
- Lead with the **outcome number** on screen, never the feature: "159 follicles" / "hs-CRP 5.4→2.1."
- The **cohort** is the product. A single user can't see a barometric flare or a shed-phase spike — the long-running agent connecting 8 people can.
- End every demo on the **Accountability Gate**: the app observes, recommends one thing, and hands medical judgment to the human. That gate *is* the community engagement loop.
- Close: "Everything you just saw is live on this phone. Pick a goal, and it's tracking you by tonight."

*All profiles and data are synthetic.*

---

## SIMPLER DEMOS (easier to explain, faster to show)

These drop the labs and CV pipeline. One number, one photo, one obvious "the group caught what you couldn't." Explainable in one breath.

### DEMO 3 — Sleep & Energy (dead simple)

**Hook:** "Jordan keeps 'fixing' his sleep and still wakes up tired — his tracker shows hours slept, but never *why* the good nights were good."

**Cohort — `coh_sleep_reset`:** Jordan (29, fall asleep faster, logs bedtime + 1–5 morning-energy slider), Amara (34, stop 3am wakeups, logs wake-count + caffeine cutoff time), Leo (41, more deep sleep, logs bedtime + screen-off time).

**Timeline:**
- **Day 1:** Jordan logs bedtime 12:40am, energy 2/5. That's it — two taps.
- **Day 15:** Agent spots a cohort pattern: everyone's 4/5+ energy mornings share one thing — **screens off ≥45 min before bed**, not total hours.
- **Day 30 — Aha:** Total sleep barely moved, but nights with the 45-min screen gap averaged **energy 4.1 vs 2.3**. Auto-upgrade: protocol swaps the goal from "sleep 8 hours" to "screens off by 11:15pm," and adds a nightly reminder.

**Phone action:** Point to one bar chart — energy on screen-gap nights vs not. Then tap the Accountability card: "Your best mornings aren't about hours. They're about the 45 minutes before bed."

### DEMO 4 — Daily Steps & Mood (most relatable)

**Hook:** "Priya walks to 'feel better' but can't tell if it's actually working — her step app counts steps and stops there."

**Cohort — `coh_move_mood`:** Priya (26, walk for anxiety, logs steps + 1–5 mood slider), Marcus (33, beat afternoon slump, logs steps + energy dip time), Nina (48, consistency after injury, logs steps + a daily selfie).

**Timeline:**
- **Day 1:** Priya logs 3,200 steps, mood 2/5. One tap + slider.
- **Day 15:** Agent flags across the cohort: mood lifts aren't tied to *step count* — they're tied to **walks taken before noon**.
- **Day 30 — Aha:** 8,000-step evenings did little for mood; even 4,000 **morning** steps averaged **mood 4.0 vs 2.4**. Auto-upgrade: goal changes from "10k steps" to "a morning walk by 11am," logged with the date.

**Phone action:** Show the mood line climbing on morning-walk days. Tap the Accountability card: "Morning walks move your mood. Evening ones don't. Locked your goal to before 11am."

**Why these demo better:** one metric + one feeling, no lab parsing or CV. The "Aha" is a timing insight anyone in the room feels instantly, and the cohort angle still lands: *you couldn't see it alone; the group made it obvious.*
