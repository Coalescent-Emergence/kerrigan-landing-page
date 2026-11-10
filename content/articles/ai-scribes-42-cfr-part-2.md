---
title: "AI documentation tools and 42 CFR Part 2: what clinical directors need to verify"
description: "42 CFR Part 2 AI scribe guide: what the rule says about records, QSOs and vendors, and what to verify with your compliance officer."
date: 2026-10-08
lastmod: 2026-11-04
slug: ai-scribes-42-cfr-part-2
keywords:
  - 42 CFR Part 2 AI scribe
  - 42 CFR Part 2 AI documentation
  - is AI transcription allowed under Part 2
  - QSOA AI vendor
  - qualified service organization agreement
  - SUD counseling notes
  - substance use disorder treatment documentation
summary: "What the Part 2 rule text says about AI scribes, and the questions a clinical director should settle with a compliance officer before signing."
draft: false
---

Your clinicians are behind on notes. Someone is pitching you an AI scribe. Your compliance officer has one question, and it is the right one: where does the session go?

**The short answer:** Title 42 of the Code of Federal Regulations (CFR), Part 2, the rule on substance use disorder (SUD) patient records, does not mention AI, so it neither bans AI scribes nor approves them. What you verify is how a vendor handles your patients' records under rules Part 2 already has: what counts as a record, who may act as your outside service provider, and security. Four checks cover it.

This article answers the question from the regulation itself, section by section, and every regulatory statement links to the section it comes from. Use it to start the conversation from the rule text, not a sales deck.

## Why the question got harder in 2026

The 2024 Part 2 final rule was published on February 16, 2024. Its compliance date was two years later: "Persons subject to this regulation must comply with the applicable requirements of this final rule by February 16, 2026" ([final rule, Dates](https://www.federalregister.gov/documents/2024/02/16/2024-02544/confidentiality-of-substance-use-disorder-sud-patient-records)).

Enforcement started the same day. The Department of Health and Human Services (HHS) Office for Civil Rights (OCR) said its program "marks the first time civil enforcement mechanisms will be available to protect the confidentiality of SUD patient records by covered SUD programs."

It also said that starting February 16, 2026, OCR would accept complaints and breach notifications for SUD records ([OCR announcement, February 13, 2026](https://www.hhs.gov/press-room/hhs-announce-civil-enforcement-program-sud-patient-records.html)).

Penalties now run through sections 1176 and 1177 of the Social Security Act ([42 CFR 2.3(a)](https://www.ecfr.gov/current/title-42/section-2.3)). HHS describes this as aligning Part 2 penalties with the Health Insurance Portability and Accountability Act (HIPAA) ([HHS fact sheet](https://www.hhs.gov/hipaa/for-professionals/regulatory-initiatives/fact-sheet-42-cfr-part-2-final-rule/index.html)).

Any vendor you approve now is approved while that program is running.

## Is AI transcription allowed under Part 2?

Part 2 does not mention AI. We searched the current eCFR (electronic Code of Federal Regulations) text of the regulation: it contains no reference to artificial intelligence, transcription or audio.

So the real question is narrower. Does this vendor's handling of your patients' information fit the rules Part 2 already has for records, for outside service providers, and for security? Answering that takes four checks.

## 1. Decide what counts as a record

Part 2 defines records broadly: "any information, whether recorded or not, created by, received, or acquired by a part 2 program relating to a patient," with examples that include "emails, voice mails, and texts" ([42 CFR 2.11, Records](https://www.ecfr.gov/current/title-42/section-2.11)). The restrictions apply to information that would identify a patient as having a substance use disorder and that comes from a federally assisted program ([42 CFR 2.12(a)](https://www.ecfr.gov/current/title-42/section-2.12)).

An AI scribe produces more than a note. List every artifact it creates:

- the session audio
- the live or imported transcript
- the AI-generated draft
- every revision before signature
- logs, metadata and anything kept for "quality improvement"

Next to each item, note whether it is a Part 2 record and who holds it. The rule never names AI output, so treating all of it as a record until told otherwise is the cautious place to start.

## 2. Pin down the vendor relationship: the qualified service organization agreement (QSOA) for an AI vendor

Part 2's mechanism for outside service providers is the **qualified service organization** (QSO). The definition covers someone who provides services to a Part 2 program "such as data processing," and who has signed a written agreement with the program, usually called a qualified service organization agreement (QSOA), in which it:

- "Acknowledges that in receiving, storing, processing, or otherwise dealing with any patient records from the part 2 program, it is fully bound by the regulations in this part," and
- "If necessary, will resist in judicial proceedings any efforts to obtain access to patient identifying information" except as Part 2 permits.

Both quotes are from [42 CFR 2.11, Qualified service organization](https://www.ecfr.gov/current/title-42/section-2.11). With that agreement in place, Part 2's restrictions do not apply to communications between the program and the QSO "of information needed by the qualified service organization to provide services to or on behalf of the program" ([42 CFR 2.12(c)(4)](https://www.ecfr.gov/current/title-42/section-2.12)).

Three details matter for an AI vendor.

**A business associate agreement (BAA) may also count, under conditions.** The 2024 rule expressly includes HIPAA business associates as QSOs "where the QSO meets the definition of business associate for a covered entity that is also a part 2 program" ([final rule, summary of §2.11](https://www.federalregister.gov/documents/2024/02/16/2024-02544/confidentiality-of-substance-use-disorder-sud-patient-records)). Whether your vendor's BAA alone is enough, or you also need QSOA language, is your compliance officer's call. Ask the vendor which document it will sign, and get the actual text.

**"Needed" is a limit.** The exception covers information the QSO needs to provide its service. Ask what the vendor keeps after the note is signed, and why.

**Downstream parties are the real test.** SAMHSA (the Substance Abuse and Mental Health Services Administration) guidance, quoted in the 2018 rule and repeated in the preamble to the 2024 rule, is that "a QSOA does not permit a QSO to re-disclose information to a third party unless that third party is a contract agent of the QSO, helping them provide services described in the QSOA" ([2024 final rule preamble](https://www.federalregister.gov/documents/2024/02/16/2024-02544/confidentiality-of-substance-use-disorder-sud-patient-records)).

The same SAMHSA guidance says the agent may further disclose the information only back to the QSO or to the Part 2 program it came from.

So for each company in the vendor's pipeline, ask: is it a contract agent, and does the data only flow back? That leads straight to architecture.

## 3. Follow the audio

An AI scribe is a pipeline. Audio is captured, then transcribed, then a language model drafts a note, then it is stored. Each step may run on the vendor's own systems or be sent to another company.

Architectures vary widely. At one end is a thin application layer that sends your session audio to a third-party transcription API. At the other end, transcription runs on infrastructure the vendor controls. Either can be described as "secure." What differs is how many separate parties end up holding your records, and under which agreements.

Note drafting is usually a separate step, and many tools send it to a cloud provider's model service. What matters there is which provider, inside whose account, and under what contract.

Ask for a data-flow diagram that names every company at every step. For each one, ask:

- Is this a third party, or infrastructure the vendor controls?
- What agreement binds it, and does that agreement say it may not train models on your data?
- Does it keep anything after the step completes, and for how long?

Then check whether each step fits the QSO structure above. A vendor that cannot produce this diagram has answered the question already.

## 4. Watch the line around SUD counseling notes

The 2024 rule created a new category. **SUD counseling notes** are notes "documenting or analyzing the contents of conversation during a private SUD counseling session or a group, joint, or family SUD counseling session and that are separated from the rest of the patient's SUD and medical record" ([42 CFR 2.11](https://www.ecfr.gov/current/title-42/section-2.11)).

HHS's fact sheet says these notes "require specific consent from an individual and cannot be used or disclosed based on a broad TPO (treatment, payment and health care operations) consent" ([HHS fact sheet](https://www.hhs.gov/hipaa/for-professionals/regulatory-initiatives/fact-sheet-42-cfr-part-2-final-rule/index.html)).

Recordings sit outside the category. The preamble says the definition, "like the definition of 'psychotherapy notes' under HIPAA, does not include such recordings," meaning audio or video ([89 FR 12548](https://www.federalregister.gov/documents/2024/02/16/2024-02544/confidentiality-of-substance-use-disorder-sud-patient-records)).

Because a transcript captures the conversation itself, it may be argued to sit near that definition. That is not a settled reading.

If your program keeps separate counseling notes, ask how AI transcripts and drafts fit that practice. Then ask the vendor where those artifacts live and whether they ever land in the main record without a clinician deciding they should.

## Security, deletion and breach

Part 2 programs must have formal policies covering electronic records, including "Creating, receiving, maintaining, and transmitting such records," "Destroying such records, including sanitizing the electronic media on which such records are stored," and "Using and accessing electronic records" ([42 CFR 2.16(a)](https://www.ecfr.gov/current/title-42/section-2.16)). HIPAA's breach notification provisions now apply to breaches of unsecured Part 2 records ([42 CFR 2.16(b)](https://www.ecfr.gov/current/title-42/section-2.16)).

Ask how the vendor's handling maps onto those policies:

- **Retention.** How long is audio kept? Is that enforced by an automated job, or is it just a setting?
- **Deletion.** Who can delete a record? Is each deletion attributed to a person and a reason?
- **Access logging.** Which reads are logged: notes only, or transcripts and audio too? Ask to see a sample log entry.
- **Breach.** How and when will the vendor notify you?

The vague answer to listen for is "everything is logged." Ask what "everything" means.

## Accuracy belongs on the compliance checklist

A review step only protects you if the tool enforces it. SAMHSA's 2026 report places documentation in "the low-risk, easier-to-automate quadrant," in part because "errors are typically reviewable by a clinician before reaching a patient." The same report, citing a May 2026 report from Canada, notes that "AI scribes can and do make errors" ([SAMHSA, *Artificial Intelligence in Mental Health Services*](https://library.samhsa.gov/sites/default/files/ai-mental-health-services-pep26-01-003.pdf)). That report is evidence, not regulation.

Ask whether anything can change a signed note without the clinician approving the change, and whether earlier versions are kept.

## The short version for your meeting

Bring these to your compliance officer and the vendor.

1. Which document will you sign: a QSOA, a BAA, or both? Send the text.
2. Name every company that touches audio, transcripts or drafts.
3. Which of those steps run on infrastructure you control?
4. What do the model provider's terms say about training on our data?
5. What do you keep after signature, for how long, and what deletes it?
6. Which accesses are logged, and can we see an example?
7. Can a note change without the clinician approving it?
8. Where do transcripts live relative to our counseling notes?
9. Does our state add consent requirements for recording or AI use in sessions?

We cover most of these, with what good and bad answers sound like, in [the questions to ask an AI scribe vendor](/articles/questions-to-ask-an-ai-scribe-vendor/).

To see Kerrigan, visit [our home page](https://latentworx.com/).

*This article is not legal advice. Check what you find against your program, your state and your contracts.*
