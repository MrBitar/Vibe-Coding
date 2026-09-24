# Therapy Support Website

## What this is

A website where a user describes or selects how they feel (free-text journal entry, or a
mood/emotion picker) and receives supportive, evidence-informed guidance drawn from the
published work of recognized therapists and researchers — never an AI-invented opinion,
and never a diagnosis.

This is a peer-support / psychoeducation tool, not a clinical or diagnostic service.
Treat every feature decision through that lens.

## Non-negotiable safety rules

These apply to every piece of copy, every response template, and every feature. Do not
relax them for UX convenience.

1. **No diagnosis, ever.** Never say "you have X disorder" or imply a clinical label
   applies to the user. Acceptable framing: "people who describe feeling this way have
   sometimes been helped by...". Always close with an explicit nudge to see a licensed
   therapist/counselor/doctor to confirm what's actually going on for them.
2. **Crisis detection comes first.** Before anything else runs, screen input for
   indicators of suicidal ideation, self-harm, abuse, or danger to others. If detected,
   immediately surface crisis resources (e.g. 988 Suicide & Crisis Lifeline in the US,
   or the user's local equivalent) instead of, or above, any other content. Never let a
   citation/solution flow suppress or delay this.
3. **Every suggestion must cite a real, checkable source with a working link** — a named
   therapist/researcher, the publication or modality, and a direct link to the actual
   letter, paper, or case document (e.g. a DOI, PubMed/APA PsycNet page, archive.org
   scan, or official institutional page). No unsourced "advice," and no citation without
   a link the user can click through to read themselves. If a good linkable source can't
   be found for a given feeling/situation, say so rather than inventing one or linking to
   something unverified.
4. **Disclaimers are persistent, not one-time.** A visible reminder ("this is
   educational, not a substitute for professional care") should appear near every
   response, not just buried in a footer or onboarding screen once.
5. **Privacy by default.** Treat everything a user writes as sensitive health data.
   Minimize storage, avoid third-party analytics on entry content, and never require
   an account just to get support.

## Core user flow

1. **Input** — user either writes freely ("how I feel right now") or picks from a
   structured list of emotions/situations (e.g. anxiety, grief, burnout, relationship
   conflict, low motivation, anger, insomnia).
2. **Crisis screen** — run the input through crisis-indicator detection first (see above).
3. **Matching** — map the input to one or more concepts/situations in the curated
   knowledge base (see below), not a live open-ended web search per request. Live
   research is done up front to build the knowledge base, not on the fly per user.
4. **Response** — present:
   - A short, plain-language reflection of what the person described (no labeling).
   - One or more evidence-informed approaches that have helped in similar documented
     cases, each with its source and the therapist/researcher behind it.
   - The "case precedent" framing: briefly describe the kind of case/history the
     approach comes from, so the user can judge fit for themselves.
   - **A direct link to the original letter, paper, or case document** for each source
     cited, so the user can go read the real thing themselves rather than take the
     summary on faith. If multiple documented cases match, surface more than one link.
   - A closing recommendation to consult a licensed professional, phrased as
     "you'd want to check this with someone qualified" rather than an alarming warning.

## Knowledge base — sourcing standards

This is the slow, careful part the user explicitly asked to not rush. The knowledge
base is a curated library, built once (and revisited periodically), not generated live
per request.

**Only draw from:**
- Peer-reviewed journals and meta-analyses (e.g. via PubMed, APA PsycNet).
- Primary published works/letters/case studies by recognized therapists and
  researchers — e.g. Carl Rogers (person-centered therapy), Aaron Beck & Judith Beck
  (CBT), Albert Ellis (REBT), Marsha Linehan (DBT), Irvin Yalom (existential/group
  therapy case writing), John Bowlby & Mary Ainsworth (attachment), Viktor Frankl
  (logotherapy), Peter Levine / Bessel van der Kolk (trauma), Susan Johnson (EFT for
  couples), Steven Hayes (ACT).
- Recognized institutional sources: APA, NIMH, NHS, WHO mental health guidance,
  reputable university clinical psychology publications.

**Reject:**
- Uncredentialed blog posts, unsourced "self-help" content, wellness-influencer content,
  anything that can't be traced to a named author and publication.
- Anything promising a cure, a guaranteed fix, or fast results.

**For each knowledge base entry, record:**
- Situation/emotion it addresses.
- Therapist/researcher and their approach or modality.
- Source (title, publication, year) with a real, verifiable citation.
- **A direct, working link to the actual letter/paper/case document** — not just a
  citation. Prefer stable, durable links: DOI, PubMed/PMC, APA PsycNet, JSTOR,
  archive.org/Internet Archive scans of original letters, official university or
  institutional archives. Avoid link rot: prefer permanent identifiers over ordinary
  URLs where one exists, and periodically re-check that links still resolve.
- A short summary of the case history or study the recommendation is drawn from —
  who it was applied to, what happened, and its documented outcome.
- Any caveats (population studied, limitations, if outcomes were mixed).

If a genuinely similar documented case exists but no legitimately linkable copy of it
can be found (e.g. paywalled with no public mirror, or the only copies online are
unverified transcriptions), note the source but flag it as "citation only, no verified
link available" rather than linking to something questionable.

When adding new entries: prioritize accuracy, traceability, and a strong library of
linked primary documents over sheer coverage. A smaller knowledge base of well-sourced,
well-linked entries beats a large one with weak or missing links — this is sensitive
content and quality control here matters more than breadth or speed.

## Tone

Warm, plain-language, non-clinical. Speak to the person, not about a "case." Avoid
jargon unless immediately explained. Never sound authoritative about what's wrong with
someone — only about what has documented history of helping others in similar
situations.
