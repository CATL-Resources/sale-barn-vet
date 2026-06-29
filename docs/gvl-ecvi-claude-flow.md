# GVL eCVI — fill with Claude in the browser

Status: spec, ready to build once prerequisites land. Owner: Chandy.
Last verified against the live GVL form: 2026-06-29.

## What this is
A sale barn vet's real output is the health paper (CVI) plus the
change of ownership, not an animal history. After a sale, each buyer
load that ships needs an electronic CVI filed in GlobalVetLink (GVL).
Today that is hand-typed. This is the bridge until GVL gives us a
server-side token: the app produces a ready-to-paste payload, the vet
opens GVL in Chrome, Claude fills the form, the vet reviews every field
and signs by hand. Auto-fill yes, auto-sign never. A direct API push
stays out of scope.

## 1. The flow in one picture
App builds a buyer load -> "Generate CVI" produces a payload (header
values plus one block per lot) -> vet opens GVL in Chrome and is logged
in under their own credentials -> vet hands Claude the payload -> Claude
fills the certificate and each animal group -> vet reviews every field
and signs by hand -> vet copies the GVL certificate number back into the
app.

## 2. The GVL eCVI form, as it actually works
Verified live on user.globalvetlink.com. The form has two layers: one
certificate shell, and one or more animal groups attached to it.

Certificate shell (one set per CVI):
- Signature type: Electronic or Wet-ink (required). Leave on Electronic.
- Ownership: Consignor / owner and Consignee / recipient, both required,
  both a contact search with a Create-new option.
- Movement: two checkboxes default ON, "Origin same as consignor" and
  "Destination same as consignee". Shipping date. Carrier type (required,
  e.g. Truck/Trailer). Carrier: pick one of Consignor / Consignee / Other
  (required).
- Animals header: Inspection date (must be within 10 days of signing),
  Species, Species Type (appears after Species; Bovine -> Beef),
  Purpose of movement.
- Permit: permit number, brand inspection date, brand inspection number.
- Remarks: select an existing saved remark or create a new one. Remarks
  are reusable.
- Area status: Tuberculosis, Brucellosis, Pseudorabies, each N/A / Free /
  class. Herd / flock status block below it.
- SmartEngine: GVL's compliance engine. It only generates its questions
  once origin, destination, purpose, species, and at least one animal
  exist.

Animal group record (one per lot on the certificate):
- Type toggle: Individual or Group. Use Group for these loads.
- Head count: the first field, at the top of the group form. It creates
  exactly that many ID rows. Row count therefore equals head count.
- Group name or description (the lot name, e.g.
  "06262026 Buyer 811 Feeder Cows").
- Owner(s) and Agent(s).
- Estimated average age (number plus a unit) or a text age such as
  "Mature", or Estimated average DOB.
- Breed, Gender, Color (all required).
- Identification: a grid where each ID type is its own column. Each column
  has a Type of ID header chosen from a list that includes
  "AIN (840) tag - RFID" and "Back Tag". Add a column per ID type. Paste
  a value into every cell of every column; the grid scrolls sideways for
  more columns. GVL blocks save with "Select a type of ID for all IDs"
  until each column's type is set.
- Narrative descriptions: brand description, and a per-lot remarks /
  narrative field.

Gate confirmed: you cannot add any animal until a consignor and a species
are both set.

Stop line: the certificate's "Preview & sign" button. Claude fills up to
it and never clicks it.

## 3. The payload "Generate CVI" hands off
Two clearly separated parts.

Header block (one set per certificate), as labeled value pairs:
- Origin = St Onge Livestock Yards. Always, for these outbound papers.
- Consignor / owner = St Onge Livestock Yards (the barn is the present
  owner at shipping; the sale's new owner is the consignee).
- Consignee / recipient (new owner) = the buyer (party acting as buyer,
  buyer_number).
- Destination = the load's actual destination premises (name and full
  address). This can differ from the buyer's address, so it is a separate
  value, and the instruction set unchecks "Destination same as consignee"
  when it differs.
- Carrier = which of consignor / consignee / other is hauling. Varies per
  load; the app cannot know it, so the vet sets it at fill time.
- Carrier type, shipping date, inspection date, species (Bovine), species
  type (Beef), purpose of movement, head count.
- Standard remarks (e.g. "For feeding and slaughter only", the not
  M-branded statement) as reusable remark text.
- The vet, the disease/area-status block, and SmartEngine are filled by
  GVL itself. The app supplies none of them and Claude never touches them.

Per-lot animal block (one per lot, repeated):
- Group name, head count, average age or text age, breed, gender, color,
  per-lot remark.
- The IDs as columns by ID type: one column of "AIN (840) tag - RFID"
  values, and a "Back Tag" column when back tags exist. Tags are exact
  text strings. Every cell has a value; a missing back tag is the literal
  word NA, matching the signed papers.
- The number of ID rows equals the head count.

Grouping rule: one CVI equals one buyer, one destination, one carrier,
carrying however many lots go there. All lots headed to the same new owner
become animal groups on the same certificate.

## 4. Field mapping (payload -> GVL)
- Origin -> Movement > Origin (St Onge; "same as consignor" stays checked
  because consignor is St Onge).
- Consignor / owner -> Ownership > Consignor / owner (St Onge).
- Consignee / recipient -> Ownership > Consignee / recipient (the buyer).
- Destination -> Movement > Destination (uncheck "same as consignee" when
  it differs; enter the premises).
- Carrier choice -> Movement > Carrier (consignor / consignee / other).
- Carrier type -> Movement > Carrier type.
- Inspection date -> Animals > Inspection date.
- Species / species type -> Animals > Species / Species Type.
- Purpose of movement -> Animals > Purpose of movement.
- Standard remarks -> Remarks (select existing or create).
- Per lot: group name -> Group name or description; head count ->
  Head count; age -> Estimated average age or text age; breed/gender/color
  -> Breed/Gender/Color; per-lot remark -> Remarks / narrative; tag columns
  -> Identification columns, one Type of ID per column.

## 5. What Claude in Chrome is told to do (instruction-set requirements)
The reusable instruction set must:
- Fill only from the provided payload. Never invent or guess a value;
  leave blank and flag it.
- For each lot: set Type to Group, enter the head count first, then set the
  Type of ID on each column, then paste that column's values. Preserve tag
  strings exactly; no reformatting, no dropped leading digits, no
  scientific notation. Empty cells get the literal NA.
- Never touch the vet fields, the disease/area-status block, or any
  SmartEngine question. Stop and hand back to the vet at every SmartEngine
  prompt.
- Hard stop before Preview & sign, submit, or pay. Auto-fill yes, auto-sign
  never.
- After filling, print a readback of every value entered and a list of
  anything it could not fill, for the vet to check against the source.

## 6. Trust and safety model
Auto-fill yes, auto-sign never. The vet logs into GVL under their own
credentials; Claude never handles GVL credentials. The vet reviews every
field and signs by hand. Tag-string fidelity is treated as a legal-document
requirement. The right vet on the paper depends entirely on the right
person being logged in — this is a human checklist item, not something the
app controls. The payload carries only what the CVI needs.

## 7. Runbook (sale day)
1. In the app, open the buyer load and click Generate CVI.
2. Open GVL in Chrome; confirm the correct vet is logged in.
3. Start a CVI; let Claude fill the shell from the header block.
4. For each lot, let Claude create a Group animal: head count first, then
   columns by ID type, then paste.
5. Set the Carrier choice for this load.
6. Read Claude's readback against the source; fix anything flagged.
7. Answer any SmartEngine compliance questions yourself.
8. Preview and sign by hand.
9. Copy the GVL certificate number back into the app.

## 8. Recording the result
After signing, the vet copies the GVL certificate number into the app.
The app writes or updates a `document` row (type cvi; status draft ->
generated -> signed; gvl_reference). For v1 the reference is hand-entered.

## 9. What is needed to build it
Prerequisite, not yet built: the office / buyer-load layer. There is no
buyer-load or document screen yet, so Generate CVI has nothing to hang on.
That layer must come first.

App work, once that exists:
- A Generate CVI action on the buyer-load / document screen that emits the
  header block plus per-lot animal blocks, with copy buttons, head counts,
  and a link to GVL.
- Reuse lib/reports/export.ts (buildTsv / copyTsv / exportXlsx) for
  tab-separated, clipboard, TEXT-typed tag columns. The animal columns are a
  new column set fed through these.

Data gaps to close (verify against the live Supabase schema before
building — information_schema.columns and pg_indexes; do not trust handoff
docs):
- A destination premises (name and full address) on the buyer load,
  separate from the buyer's own address.
- A clean per-animal or per-lot sex/gender value.
- Premises ID for the barn origin (GVL shows PIN/LID blank on the signed
  papers, so this may be optional).
- Confirmed: no test or vaccination rows are needed; required items ride in
  Remarks. No test-result model required.
- Confirmed: the accredited vet identity is auto-assigned by GVL login and
  is never stored or filled by the app.

Authored separately later: the Claude instruction set itself (this task
specs its requirements only).

## 10. Open questions
- GVL terms of service: confirm that an extension typing into the form,
  with a human reviewing and signing, is within their rules. Low risk since
  paste is a normal supported action, but check before launch.
- Remarks: for v1, does the vet type required statements in GVL by hand, or
  does the app suggest the remark text? Leaning hand-typed for v1.
- The grid's Actions menu: confirm at build time exactly how a second ID
  column is added and whether a whole column can be pasted at once.
