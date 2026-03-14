# CECB Compliance Plan (Web2 Track PS-2 PARIVESH)

This plan is derived from:
- Checklist - Categories.pdf
- Affidavits.pdf
- EDS Points.pdf

## 1) Common Document Requirements Identified

Across categories, CECB repeatedly asks for:
- Processing fee details
- Pre-feasibility report (PFR)
- EMP
- Form-1 / 1-M / CAF
- Land documents + consent of land owner (where applicable)
- LOI / LOI extension / lease deed (where applicable)
- 200m / 500m certificates
- Gram Panchayat NOC
- Mining plan approval + approved plan (mining categories)
- Forest/Wildlife/NBWL related clearances (if applicable)
- Water NOC / CTE/CTO (where applicable)
- Geotag photos / drone video / KML
- CER details + local consent
- Affidavits
- GIST submission

## 2) Affidavit Themes Identified

Affidavit points frequently cover:
- No mining outside lease and no excavation in prohibited/safety strips
- Plantation commitments and survival rate
- Dust suppression/water sprinkling
- No polluted discharge to natural water bodies
- Transport controls and tarpaulin covering
- Compliance to SC/MoEFCC notifications/orders
- No pending litigation declarations
- Six-monthly compliance reporting
- Restoration and CEMP/CER commitments

## 3) EDS Point Bank Identified

EDS sheet includes a reusable list of asks such as:
- Missing fee/PFR/EMP/Form-1 details
- Missing compliance reports (CTE/CTO/EC)
- Missing mining/forest/wildlife/water docs
- Missing boundary/KML/drone/geotag artifacts
- Missing affidavits and category-specific permissions

## 4) Current App Coverage (Already Implemented)

Implemented in current product:
- Role workflow: Proponent -> Scrutiny -> MoM -> Finalized/Admin
- Mandatory PDF uploads in Apply
- Scrutiny checklist + EDS remarks flow
- MoM generation/finalization
- Backend processing of uploaded PDFs

## 5) High-Priority End-Term Gaps

To maximize CECB checklist compliance, add these before final evaluation:

1. Category-wise document matrix
- Maintain required docs by category (Sand/Limestone/Bricks/Infrastructure/Industry)
- Enforce uploads based on selected category

2. Structured EDS reason codes
- Convert free-text EDS into selectable EDS checklist points (from EDS Points.pdf)
- Keep optional free-text remarks

3. Affidavit module
- Add affidavit templates/checklist by category
- Capture declaration acceptance and uploaded notarized affidavit copies

4. Conditional compliance fields
- Add "if applicable" toggles for NBWL, wildlife, forest, CGWA, drone, etc.
- Require evidence documents only when toggles are active

5. Presentation bundle export
- Generate downloadable packet for meeting:
  - key forms
  - compliance table
  - uploaded evidence links
  - EDS closure summary

## 6) Suggested Data Model Additions

Add to application record:
- `compliance.categoryChecklist`: [{code, label, required, provided, remarks}]
- `compliance.affidavits`: [{code, accepted, documentUrl}]
- `compliance.edsCodes`: [string]
- `compliance.artifacts`: {kml, droneVideo, geotagPhotos, cteCto, waterNoc, forestNoc, wildlifePlan, nbwl}

## 7) Suggested Build Order

1. Build category-wise checklist config in Admin
2. Use config in Apply for dynamic required documents
3. Update Scrutiny to mark each requirement as verified/deficient
4. Add EDS code picker from EDS point bank
5. Add affidavit acceptance + upload flow
6. Add compliance summary export for presentation

---

Note:
- Mid-eval unaffected as per your instruction.
- This plan is aimed at maximizing end-term evaluation compliance.
