# Sale Barn Vet — Settings / Preferences Screen Spec (v1)

> **Purpose.** This screen is the **barn-config surface**. Per `spec.md` §9, the data model stores the *underlying truth* (age, official-ID-present, preg status, billing math); this screen stores *how this particular barn encodes that truth*. Get this screen right and the same animal record stays portable across barns while the chute screen stays local.
>
> **Scope of every setting below is BARN-LEVEL** (one set per sale barn / per database) unless explicitly marked **[device]** or **[user]**. Settings are not per-day and not per-animal.

## Screen IA (suggested sections / tabs)
1. Barn & Vet Profile
2. Identifiers & Validation
3. Age & Pregnancy
4. Soft Flags
5. Capture Defaults
6. Outputs (CVI & Change-of-Ownership)
7. Devices & Sync
8. Users & Access

---

## 1. Barn & Vet Profile
Identity that flows onto generated papers (§7) and seeds tag context.

| Setting | Type | Default | Drives |
|---|---|---|---|
| Barn name | text | — | Paper headers, lookup |
| Barn location / address | text | — | CVI header |
| Default state of origin | 2-digit code | — | Metal-tag prefill/context (§5) |
| Licensed vet name | text | — | CVI + change-of-ownership signer (§8) |
| Vet license # | text | — | Paper footer |
| NVAP accreditation # | text | — | CVI issuance |
| Barn logo *(optional)* | image | — | Printed papers |

---

## 2. Identifiers & Validation
**Barn-config:** *which* identifier counts as the required official ID.
**NOT barn-config (universal, do not expose as editable):** the *format rules* themselves.

| Setting | Type | Default | Notes |
|---|---|---|---|
| Official ID that counts here | enum: `Official EID` / `Official metal` / `Either` | `Either` | St. Onge = EID; many barns = metal (§5). Drives the "missing official ID" flag (§4 below). |

**Read-only reference panel** (show, don't let them edit — these are universal tag literacy):
- Official US EID = 15 digits, starts with **840**.
- Secondary/management EID may start with **900** — non-official, valid *alongside* an 840 tag, never a duplicate.
- Official metal = 2-digit state + 3 letters + 4 numbers (e.g. `46ABC4678`). Letters **A/B/C** = regular, **V/S/T** = brucellosis (bangs).

---

## 3. Age & Pregnancy

**Age designation method** — the local encoding of age (§5). Recording the designation *is* the age entry; don't force both a value and a designation.

| Setting | Type | Default | Notes |
|---|---|---|---|
| Age designation method | enum: `Tag color` / `Placement` / `Mark` / `Plain value only` | `Plain value only` | St. Onge = `Tag color`. |
| Designation → age value map | editable list of (designation value → age) | empty | Only shown when method ≠ `Plain value only`. E.g. *purple → 2yr*, *yellow → 3yr*. This is the heart of the barn-config pattern. Mirrors the `age_color_map` table. |

**Pregnancy**

| Setting | Type | Default | Notes |
|---|---|---|---|
| Bred-timing display | enum: `Months along` / `Season` | `Months along` | Months preferred — seasons confuse people (§5). |

> **Not a setting (universal logic):** preg is *gated by cattle type* — expected for bred cows, optional for pairs, hidden for bulls. Don't add a toggle for this.

---

## 4. Soft Flags
**v1 has NO hard stops** (`spec.md` §8). Every item here is a *flag the vet can override*, never a block. There is intentionally no control that converts a flag into a hard stop. (A per-state hard-stop layer is explicitly future/out-of-v1.)

| Flag | Type | Default | Notes |
|---|---|---|---|
| Duplicate tag within day | on/off | on | Excludes the legitimate 840-official + 900-secondary pairing on one animal. |
| Missing official ID | on/off | on | Uses the §2 "official ID that counts" setting. |
| EID format (15-digit / 840) | on/off | on | Field validation; recommend leaving on. |
| Metal tag format (2/3/4) | on/off | on | Field validation. |
| Odd-one-out vs. batch | on/off | on | Animal missing a field the rest of its group has. |
| Expected-count reached/passed | on/off | on | Gentle heads-up (see §5). |

---

## 5. Capture Defaults
Tunes the chuteside pen-flow (§3) without changing its fixed mechanics.

| Setting | Type | Default | Notes |
|---|---|---|---|
| Default animal type for new pens *(optional prefill)* | enum (cattle type) / none | none | Prefills the sticky header; still editable per pen. |
| Expected count required up front | on/off | off | If on, prompts for count at each new pen. |
| Count flag trigger | enum: `At expected` / `Expected + N` (+ N input) | `At expected` | When the gentle count flag fires. |

> **Fixed rules — do NOT make these settings:** pen / seller / buyer / animal type are **sticky**; tag(s) and **quick notes are always fresh (never sticky)** — a "lame" note must never bleed to the next animal (§5). "Next Pen / New Batch" is always an explicit one-tap action (never auto-advance on count).

---

## 6. Outputs (CVI & Change-of-Ownership)
Papers are **generated**, never hand-filled (§7). Header/signer fields pull from §1.

| Setting | Type | Default | Notes |
|---|---|---|---|
| Default CVI delivery | enum: `Electronic` / `Print` / `Both` | `Electronic` | Surfaces on the buyer side, esp. out-of-state. |
| Change-of-ownership delivery | enum: `Electronic` / `Print` / `Both` | `Print` | The vet's half of the state traceability trail. |
| XLSX tag columns as text | read-only (fixed on) | on | Protects 15-digit 840 EIDs in exports; not optional. |
| GVL eCVI mode | enum: `Chrome stopgap` / `Token integration` | `Chrome stopgap` | Durable token path is post-v1. |
| Printer selection **[device]** | device printer picker | system default | Per-device. |

---

## 7. Devices & Sync
Surfaces the online-primary + per-device local-fallback model (§10). Mostly status/registration in v1.

| Item | Type | Notes |
|---|---|---|
| This device's role **[device]** | enum: `Chute tablet` / `Chute laptop` / `Office` | Distinguishes capture vs. assemble context. |
| Registered devices on this barn DB | list (view/name) | All devices share one database concurrently. |
| Sync status **[device]** | read-only | Online / offline, last-sync time, pending-push count when reconnecting. |
| Conflict/merge policy | read-only (info) | Source-of-truth for offline edits is a foundation-level decision; display only in v1. |

---

## 8. Users & Access *(can be minimal in v1)*
| Setting | Type | Notes |
|---|---|---|
| User role **[user]** | enum: `Office (work orders + pricing)` / `Crew (capture)` / `Vet (capture + papers)` | Paper generation/signing tied to the licensed vet — legal judgment stays with the vet (§8). |

---

## Design guardrails (call-outs for whoever builds the screens)
- **Editable vs. universal:** anything in §2's reference panel, the preg-gating logic, the quick-notes-never-sticky rule, the explicit "Next Pen" action, and XLSX-tags-as-text are **universal** — render them as fixed/read-only, not as toggles.
- **No hard-stop control anywhere** in v1.
- **Every barn-config setting** should visually reinforce "we store the truth, you tell us your local encoding" — especially the §3 age designation→value map (backed by `age_color_map`) and the billing rate card (backed by `work_type`).
