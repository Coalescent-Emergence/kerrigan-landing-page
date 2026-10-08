---
title: "Questions to Ask an AI Scribe Vendor Before It Touches a Session"
description: "Ten questions to ask an AI scribe vendor, with the document to request and the bad answer to listen for. Written for Part 2 and behavioral health programs."
date: 2026-10-08
lastmod: 2026-10-08
slug: questions-to-ask-an-ai-scribe-vendor
keywords: ["questions to ask an AI scribe vendor", "does my AI scribe train on patient data", "AI vendor security checklist behavioral health", "behavioral health AI vendor questions", "42 CFR Part 2 AI scribe", "qualified service organization agreement", "AI scribe BAA"]
summary: "Ten questions a substance use or behavioral health program should put to any AI scribe vendor, with how to verify each answer yourself."
draft: false
---

An AI scribe hears everything said in the room. In a substance use program that includes the fact Part 2 exists to protect: that this person has been diagnosed with, treated for, or referred for treatment of a substance use disorder ([42 CFR 2.11](https://www.law.cornell.edu/cfr/text/42/2.11), definition of "disclose"). Before any vendor gets a recording, someone at your program should be able to answer the questions below from documents, not from a sales call.

This list goes past HIPAA to the layer a substance use program actually lives under: 42 CFR Part 2 records, the qualified service organization agreement, group sessions, and what happens to the audio itself. For each question you get why it matters, what to ask for, and what a bad answer sounds like, so you can hand the list to your compliance officer and score any vendor honestly. That includes us.

This is not legal advice. It is a list of things to verify with your compliance officer, who knows your program, your state and your contracts.

## How to score

For each question, mark the answer one of three ways: **documented** (they handed you a contract clause, a diagram, a log export or a policy), **verbal** (they said it, but nothing on paper backs it), or **no**. A verbal answer is not a weak yes. It is a promise you cannot enforce.

## 1. Where does the session audio go, and which companies touch it?

**Why it matters:** every company the recording passes through is another set of terms, another copy, and another place a subpoena or a breach can reach.

**Ask for:** a data flow diagram that follows the audio, the transcript and the drafted note separately, naming every subprocessor at each step (transcription, note generation, storage, logging, support tools).

**A bad answer sounds like:** "We work with leading AI partners" or "Everything stays in a secure cloud." If they cannot name the company that turns speech into text, they either do not know or do not want you to.

## 2. Will you sign a BAA, and does it reach every subprocessor?

**Why it matters:** HIPAA lets a covered entity hand protected health information to a business associate only with written "satisfactory assurance" that it will be safeguarded ([45 CFR 164.502(e)](https://www.law.cornell.edu/cfr/text/45/164.502)). The contract must require the vendor to "ensure that any subcontractors that create, receive, maintain, or transmit protected health information on behalf of the business associate agree to the same restrictions and conditions" ([45 CFR 164.504(e)(2)(ii)(D)](https://www.law.cornell.edu/cfr/text/45/164.504)).

**Ask for:** the BAA itself, before the pilot, and written confirmation that each subprocessor from question 1 is bound by its own agreement.

**A bad answer sounds like:** "Our terms of service cover HIPAA," or a BAA offered only on an enterprise tier you are not buying.

## 3. Will you sign a qualified service organization agreement?

**Why it matters:** the usual route Part 2 provides for sharing records with a service provider without patient consent is the qualified service organization (QSO). The exception covers "information needed by the qualified service organization to provide services to or on behalf of the program" ([42 CFR 2.12(c)(4)](https://www.law.cornell.edu/cfr/text/42/2.12)). A QSO is defined by a written agreement in which it acknowledges it "is fully bound by the regulations in this part" and will, if necessary, "resist in judicial proceedings any efforts to obtain access" to patient identifying information except as Part 2 permits ([42 CFR 2.11](https://www.law.cornell.edu/cfr/text/42/2.11)). Since the 2024 final rule, a business associate of a program that is also a HIPAA covered entity can qualify as a QSO for Part 2 records ([89 FR 12472](https://www.federalregister.gov/documents/2024/02/16/2024-02544/confidentiality-of-substance-use-disorder-sud-patient-records); 2.11, paragraph (3) of the QSO definition). Whether your program takes that route or signs a separate QSOA is a call for your compliance officer.

**Ask for:** the QSOA, or the BAA language that carries both Part 2 commitments above. Read for the words "fully bound" and "resist in judicial proceedings."

**A bad answer sounds like:** "Part 2 is basically HIPAA now," or "Nobody has asked us for that before."

## 4. Does the AI scribe train on patient data, and where does it say so?

**Why it matters:** in most setups, "we don't train on your data" is a statement about a contract and about whose account the model runs in. That is fine, but it means the promise lives in paperwork you can read.

**Ask for:** the exact clause that bars training, in the vendor's contract with you and in the model provider's terms with the vendor; and which company's account the note generation runs in.

**A bad answer sounds like:** "We only train on de-identified data" (so they do train), or "Our model provider doesn't train" with no clause to show you.

## 5. Who can see a transcript, and is every view logged?

**Why it matters:** Part 2 requires programs and other lawful holders to keep formal policies covering "using and accessing electronic records" ([42 CFR 2.16(a)(1)(ii)(C)](https://www.law.cornell.edu/cfr/text/42/2.16)). The transcript and the audio are where the most sensitive content sits, so they are where access logging matters most.

**Ask for:** a sample audit log export from a test account showing read events on a transcript and on audio playback, not only on the finished note. Ask who on the vendor's own staff can open session content, and how that access is approved.

**A bad answer sounds like:** "Everything is logged" with no export, or a log that shows note edits and nothing else.

## 6. How long is the audio kept, and what actually deletes it?

**Why it matters:** a BAA must require the vendor, at termination, "if feasible, return or destroy all protected health information" and "retain no copies" ([45 CFR 164.504(e)(2)(ii)(J)](https://www.law.cornell.edu/cfr/text/45/164.504)). Part 2 policies must cover destroying electronic records so the information is "non-retrievable" ([42 CFR 2.16(a)(1)(ii)(B)](https://www.law.cornell.edu/cfr/text/42/2.16)). A retention period is only real if something enforces it.

**Ask for:** the retention schedule for audio, transcripts and notes; the mechanism that enforces it; and a sample deletion record showing who deleted what, when, and why.

**A bad answer sounds like:** "Audio is deleted after a few days" from a product that also lets you replay last month's session. A retention promise and a replay button cannot both be true.

## 7. If there is a breach, when and how do you tell us?

**Why it matters:** the BAA must require the vendor to report "breaches of unsecured protected health information" ([45 CFR 164.504(e)(2)(ii)(C)](https://www.law.cornell.edu/cfr/text/45/164.504)), and the 2024 final rule applies the HITECH breach notification provisions to breaches of Part 2 records ([89 FR 12472](https://www.federalregister.gov/documents/2024/02/16/2024-02544/confidentiality-of-substance-use-disorder-sud-patient-records); [42 CFR 2.16(b)](https://www.law.cornell.edu/cfr/text/42/2.16)). You cannot act on a breach you have not been told about.

**Ask for:** the breach clause in the BAA, the vendor's incident response contact, and their notification timeline in writing.

**A bad answer sounds like:** "We've never had a breach," offered as if it answered the question.

## 8. Can anything change a signed note without the clinician approving it?

**Why it matters:** the note is the legal record. If a model can rewrite it after signature, you no longer know what the clinician attested to.

**Ask for:** a live demo of the note's revision history: who changed what, when, and whether earlier versions can be restored.

**A bad answer sounds like:** "The AI keeps the note up to date automatically."

## 9. What consent to record does your workflow assume?

**Why it matters:** federal wiretap law permits recording when one party consents ([18 U.S.C. 2511(2)(d)](https://www.law.cornell.edu/uscode/text/18/2511)), but state recording law varies and can be stricter. Check your own state's rule, and the client's state for telehealth, with your compliance officer.

**Ask for:** the vendor's suggested consent language, then check every sentence in it against what the system does. Ask how the clinician records that consent was given.

**A bad answer sounds like:** a template that promises a deletion window, or "no one else ever hears this," that the vendor's own answers to questions 1 and 6 do not support.

## 10. How do you handle a group session?

**Why it matters:** one recording now holds several clients, each of whose participation identifies them as being in treatment. Ask your compliance officer how consent is documented for each of them. One client's words also have to stay out of another client's record.

**Ask for:** how consent is captured for every participant, how speakers are attributed, and how a group transcript is split, or kept out of, individual notes. Ask whether group notes are a shipped feature or a roadmap item.

**A bad answer sounds like:** "Just put the device in the middle of the room."

## How we answer some of these

We build Kerrigan, so score us with the same list. Your client's voice is transcribed on our own GPUs and never reaches a third-party transcription API. Note inference runs inside our own AWS account, under a BAA whose terms bar training on your data. Those GPUs run in the same AWS account, so AWS hosts both steps and belongs on your diagram. On questions 2 and 3, we do not have a QSOA or BAA template yet; ask us where that stands. Nothing changes your note without you approving the diff, and notes are versioned with rollback. Deletion is actor-attributed, reason-recorded and break-glass-gated. On question 5, today it is note access that is logged; logging for transcript and audio reads is written but not yet confirmed running in production, so score that answer as partial. On question 6, we keep session audio and no automatic purge enforces a retention period yet, so we will not write a deletion window into your consent form. Kerrigan is built for 42 CFR Part 2 workflows: attested revisions, versioned notes, an immutable admin audit log, and ID-tagged deletion with a recorded reason. It does not write group notes, has no desktop or mobile app, and does not write back to your EHR. For the regulation in more depth, read our companion piece, [AI scribes and 42 CFR Part 2](/articles/ai-scribes-42-cfr-part-2/).

If you want to run this list against us with your compliance officer in the room, request access through the form on [our home page](https://latentworx.com/).
