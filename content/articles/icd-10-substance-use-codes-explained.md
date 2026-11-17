---
title: "ICD-10 codes for substance use disorder, explained character by character"
description: "ICD-10-CM codes for substance use disorder: how F10 to F19 are built, how they map to DSM-5 mild, moderate and severe, with worked examples from FY 2027."
date: 2026-11-09
lastmod: 2026-11-09
slug: icd-10-substance-use-codes-explained
keywords:
  - ICD-10 codes substance use disorder
  - ICD-10-CM F10 F19 codes
  - alcohol use disorder ICD-10 code
  - opioid use disorder ICD-10 code
  - DSM-5 ICD-10 crosswalk substance use
  - F10.20 F11.20 meaning
  - substance use disorder in remission ICD-10
summary: "How the F10 to F19 substance codes are built, how DSM-5 severity maps onto them, and the coding rules worth knowing, from the FY 2027 code set."
draft: true
---

A chart says "alcohol use disorder, moderate," and the code on the record is F10.20, "Alcohol dependence, uncomplicated." The word "dependence" sits in the code title while the chart says "use disorder." The same chart, a month later, says "in early remission," and the code is F10.21.

**The codes are not arbitrary: every character carries meaning.** In ICD-10-CM (the International Classification of Diseases, 10th Revision, Clinical Modification), the substance codes run from F10 to F19. The first three characters name the substance, the fourth names the pattern (use, abuse or dependence), and the fifth names what comes with it, such as intoxication, withdrawal or remission. Once you can read them, you can check a code against the chart.

This article takes apart those codes, category by category and character by character, and shows how they map to severity in the DSM-5 (the American Psychiatric Association's Diagnostic and Statistical Manual of Mental Disorders, 5th edition): mild, moderate or severe.


## In brief

- In ICD-10-CM, the substance codes run from F10 to F19. The first three characters name the substance, the fourth names the pattern (use, abuse or dependence), and the fifth names what comes with it, such as intoxication, withdrawal or remission.
- Moderate and severe collapse into one code, so severity lives in the clinician's documentation.
- "Dependence" in a code description is a classification label, not a second diagnosis (our reading).
- No F10 to F19 code changed in FY 2027. We compared the FY 2027 Tabular List against the FY 2026 file; we did not check how payers treat the codes.
## Which code set this describes

This article uses the **ICD-10-CM FY 2027** (fiscal year 2027) code set, effective October 1, 2026 through September 30, 2027. FY27 codes should be used for healthcare services provided in that window, per NCHS (the National Center for Health Statistics) ([ICD-10-CM files](https://www.cdc.gov/nchs/icd/icd-10-cm/files.html)).

The Tabular List is in the [FY 2027 release from the Centers for Disease Control and Prevention (CDC)](https://ftp.cdc.gov/pub/Health_Statistics/NCHS/Publications/ICD10CM/2027/icd10cm-tabular-2027.pdf). The Centers for Medicare & Medicaid Services (CMS) hosts the same files and the [guidelines](https://www.cms.gov/files/document/fy-2027-icd-10-cm-coding-guidelines.pdf) on its [ICD-10 page](https://www.cms.gov/medicare/coding-billing/icd-10-codes). What changed this year is at the end of this article.

## The chapter: F10 to F19

The block is titled "Mental and behavioral disorders due to psychoactive substance use (F10-F19)." Each three-character category is a substance family ([Tabular List, F10-F19](https://ftp.cdc.gov/pub/Health_Statistics/NCHS/Publications/ICD10CM/2027/icd10cm-tabular-2027.pdf)):

| Category | Substance family |
|---|---|
| F10 | Alcohol |
| F11 | Opioid |
| F12 | Cannabis |
| F13 | Sedative, hypnotic, or anxiolytic |
| F14 | Cocaine |
| F15 | Other stimulant |
| F16 | Hallucinogen |
| F17 | Nicotine |
| F18 | Inhalant |
| F19 | Other psychoactive substance |

Two details trip people up.

**F17 holds only nicotine dependence (F17.2-).** It has no abuse or unspecified-use branch. Its Excludes1 note (meaning: the two codes are not reported together, except for unrelated conditions) sends "tobacco use NOS" (not otherwise specified) to Z72.0. The only inclusion term of Z72.0 is "Tobacco use NOS," and it is not a use disorder.

**F15, "other stimulant," lists amphetamine-related disorders and caffeine under its Includes note.** Cocaine has its own category, F14.

## Reading a code, one character at a time

Take F10.231. Position by position:

1. **F**: the mental, behavioral and neurodevelopmental chapter.
2. **F1**: the psychoactive substance block.
3. **F10**: the substance, here alcohol.
4. **F10.2**: the pattern. In the Tabular List, 1 is abuse, 2 is dependence and 9 is use, unspecified. There is no F10.0 in FY 2027.
5. **F10.23**: what accompanies the pattern. The fifth character names the condition: 0 uncomplicated, 1 in remission, 2 intoxication, 3 withdrawal, then the induced disorders (4 mood, 5 psychotic, and so on).
6. **F10.231**: a sixth character on some codes, adding detail. Under withdrawal, 0 is uncomplicated, 1 is withdrawal delirium, 2 is withdrawal with perceptual disturbance and 9 is unspecified.

So F10.231 reads "Alcohol dependence with withdrawal delirium."

Branches differ by substance: opioid withdrawal stops at five characters (F11.23), and alcohol withdrawal runs to six. A shorter header such as F10.2 is a heading with more specific codes beneath it. Look up the full code instead of assuming a pattern from another substance.

### Character four: use, abuse or dependence

Abuse (1), dependence (2) and use, unspecified (9) are three distinct branches. Each carries an Excludes1 note against the other two. An Excludes1 note means "NOT CODED HERE!": the excluded code should never be used at the same time as the code above it, except for unrelated conditions ([Official Guidelines, Section I.A.12.a](https://ftp.cdc.gov/pub/Health_Statistics/NCHS/Publications/ICD10CM/2027/ICD-10-CM-October-1-2026-FY27-Guidelines.pdf), pp. 9 to 10).

The guidelines turn that into a hierarchy. When documentation refers to more than one pattern for the same substance, only one code is assigned, by these rules ([Section I.C.5.b.2](https://ftp.cdc.gov/pub/Health_Statistics/NCHS/Publications/ICD10CM/2027/ICD-10-CM-October-1-2026-FY27-Guidelines.pdf), p. 43):

- Use and abuse both documented: abuse.
- Abuse and dependence both documented: dependence.
- Use, abuse and dependence all documented: dependence.
- Use and dependence both documented: dependence.

### Character five: what comes with it

The fifth character is where intoxication, withdrawal, remission and the substance-induced disorders live. Four things to know.

**Intoxication and withdrawal are separate branches.** In opioid dependence, F11.22 (intoxication) and F11.23 (withdrawal) each carry an Excludes1 note pointing at the other. Alcohol is different: F10.22 and F10.23 carry Excludes2 notes against each other, which the conventions say allow both codes together. 

**Induced disorders are named for what they induce.** For alcohol dependence they are mood (4), psychotic (5), persisting amnestic (6) and persisting dementia (7). Anxiety, sexual dysfunction and sleep disorders are sixth-character detail under 8. Opioids and cannabis have fewer of these, so check the specific category.

**Remission is its own character, and the code follows what the provider documented.** An "in remission" code is assigned only on the basis of provider documentation, and selecting one requires the provider's clinical judgment ([Section I.C.5.b.1](https://ftp.cdc.gov/pub/Health_Statistics/NCHS/Publications/ICD10CM/2027/ICD-10-CM-October-1-2026-FY27-Guidelines.pdf), p. 43).

**Unspecified use (the 9 branch) has a narrow rule.** The F1x.9- codes "are to be used only when the psychoactive substance use is associated with a substance related disorder... or medical condition, and such a relationship is documented by the provider" ([Section I.C.5.b.3](https://ftp.cdc.gov/pub/Health_Statistics/NCHS/Publications/ICD10CM/2027/ICD-10-CM-October-1-2026-FY27-Guidelines.pdf), p. 44). That is not a catch-all for "client uses something."

## How DSM-5 severity maps to the codes

DSM-5 folded two older diagnoses, abuse and dependence from the 4th edition (DSM-IV), into a single disorder measured on a continuum from mild to severe. Mild requires two to three symptoms from a list of 11, according to the fact sheet from the APA (American Psychiatric Association) ([APA, DSM-5 fact sheet: Substance-Related and Addictive Disorders](https://www.psychiatry.org/getContentAsset/1c36ce25-0d04-425c-8de9-b39e5781024e/dfc3d011-8f63-43f6-9ed8-4b444333a1d0/APA-DSM5-Substance-Use-Disorder.pdf?language=en)).

For alcohol, NIAAA (the National Institute on Alcohol Abuse and Alcoholism) gives the same bands: mild (two to three criteria), moderate (four to five) or severe (six or more) ([NIAAA, Understanding Alcohol Use Disorder](https://www.niaaa.nih.gov/publications/brochures-and-fact-sheets/understanding-alcohol-use-disorder)).

ICD-10-CM never merged abuse and dependence, so the code set bridges them with inclusion terms written into the Tabular List. APA describes the relationship generally: the codes in DSM are the equivalent ICD codes ([APA, Coding and Recording Procedures](https://www.psychiatry.org/getContentAsset/136283f7-0002-4ea7-ac1f-a6eb57647b4c/dfc3d011-8f63-43f6-9ed8-4b444333a1d0/APA-DSM5TR-Coding?language=en)). The bridge itself reads:

| DSM-5 severity | ICD-10-CM branch | Example |
|---|---|---|
| Mild | Abuse (F1x.1-) | F10.10, "Alcohol abuse, uncomplicated," includes "Alcohol use disorder, mild" |
| Moderate | Dependence (F1x.2-) | F10.20, "Alcohol dependence, uncomplicated," includes "Alcohol use disorder, moderate" |
| Severe | Dependence (F1x.2-) | F10.20, same entry, includes "Alcohol use disorder, severe" |

Source for every row: [Tabular List, F10.10 and F10.20](https://ftp.cdc.gov/pub/Health_Statistics/NCHS/Publications/ICD10CM/2027/icd10cm-tabular-2027.pdf). The same pattern repeats across the other substances, with one exception: nicotine has no abuse branch, so all three tobacco severities sit under F17.200. Opioid use disorder, mild is an inclusion term at F11.10, and moderate or severe sit at F11.20.

What follows from that table:

- **Moderate and severe collapse into one code.** The code cannot tell them apart. Severity lives in the clinician's documentation.
- **"Dependence" in a code description is a classification label, not a second diagnosis (our reading).** The APA fact sheet says of the older DSM-IV diagnosis that dependence caused much confusion and can be a normal body response to a substance. The Tabular List lists "Opioid use disorder, moderate" and "severe" under F11.20, "Opioid dependence, uncomplicated," so the use disorder terms beside the title show what the code stands for.
- **Remission follows the same split.** Mild substance use disorders in early or sustained remission go to the substance abuse in remission codes. Moderate or severe ones go to the substance dependence in remission codes ([Section I.C.5.b.1](https://ftp.cdc.gov/pub/Health_Statistics/NCHS/Publications/ICD10CM/2027/ICD-10-CM-October-1-2026-FY27-Guidelines.pdf)). In the Tabular List, F10.21 covers moderate and severe, early and sustained, so early and sustained remission share one code.

## Worked examples

All descriptions below are from the FY 2027 Tabular List. The chart language is synthetic.

**F10.20, Alcohol dependence, uncomplicated.** Chart: alcohol use disorder, moderate. No intoxication, withdrawal or induced disorder documented. The fifth character 0 means none of the other branches applies.

**F10.21, Alcohol dependence, in remission.** Chart: alcohol use disorder, severe, in sustained remission. Provider documentation drives it, per the guideline above.

**F11.23, Opioid dependence with withdrawal.** Chart: opioid use disorder, moderate, with documented withdrawal. Five characters; the alcohol equivalent, F10.23-, needs a sixth.

**F10.231, Alcohol dependence with withdrawal delirium.** Chart: alcohol use disorder, severe, with withdrawal delirium documented by the provider.

**F12.10, Cannabis abuse, uncomplicated.** Chart: cannabis use disorder, mild. The Tabular List lists that exact term under F12.10.

**F17.210, Nicotine dependence, cigarettes, uncomplicated.** Chart: nicotine dependence, cigarettes. F17 has no abuse branch. The Tabular List puts "Tobacco use disorder, mild," "moderate" and "severe" all under F17.200, "Nicotine dependence, unspecified, uncomplicated," so every DSM-5 severity maps to the same dependence code. F17.210 adds the product, cigarettes.

**F10.20 plus a medical code.** Guideline Section I.C.5.b.4 covers medical conditions caused by substance use: they are not classified as substance-induced disorders. Its example is alcoholic pancreatitis due to alcohol dependence. Assign the pancreatitis code from K85.2 and the appropriate code from subcategory F10.2, such as F10.20. Assigning F10.288 would not be appropriate (p. 44). Check how your coder sequences the pair.

**One more optional code: Y90.- for blood alcohol level.** Category F10 carries a note to use an additional code from Y90.- for blood alcohol level, if applicable. A Y90 code may be assigned when the level is documented and the patient's provider has documented a condition classifiable to category F10. The level itself need not be documented by the provider to be coded ([Section I.C.5.b.5](https://ftp.cdc.gov/pub/Health_Statistics/NCHS/Publications/ICD10CM/2027/ICD-10-CM-October-1-2026-FY27-Guidelines.pdf), p. 44). That section cross-references Section I.B.14 for documentation by clinicians other than the provider.

## What the code does not do

A code names a diagnosis category. It does not record criteria met, symptom count beyond the mild versus moderate-or-severe line, or why the clinician chose a severity. That stays in the note. Which codes a payer accepts, and in what order, is a payer and coder question. 

## What changed in FY 2027

**No F10 to F19 code changed this year.** We compared the FY 2027 Tabular List for categories F10 through F19 against the FY 2026 file. The F10 to F19 section is identical, and the FY 2027 Tabular addenda list no additions, deletions or revisions to F1x codes. The coding guideline for substance disorders, Section I.C.5.b, reads the same as in the October 2025 guidelines.

Some Alphabetic Index pointers did move ([Index addenda](https://ftp.cdc.gov/pub/Health_Statistics/NCHS/Publications/ICD10CM/2027/icd10cm-addenda-2027.zip)):

| Index entry | FY 2026 | FY 2027 |
|---|---|---|
| Opioid-induced anxiety | F11.988 | F11.288 |
| Opioid-induced depressive | F11.94 | F11.24 |
| Opioid-induced sexual dysfunction | F11.981 | F11.281 |
| Korsakoff, alcoholic | F10.26 | F10.9-, with a "with dependence" subentry at F10.2- |
| Alcohol-related sexual dysfunction | not listed | gains entries at F10.181 and F10.281 |

## What we could not confirm

- Claims behavior. We compared the text of the FY 2027 and FY 2026 files, not how payers treat the codes.
- The DSM-5 severity wording against the DSM-5-TR (the DSM-5 Text Revision). This article draws on DSM-5 sources.

## About this article

We left out Part 2 confidentiality, which sits under different rules: Title 42 of the Code of Federal Regulations (CFR), Part 2. See [42 CFR Part 2 and AI documentation](/articles/ai-scribes-42-cfr-part-2/). We did not cover the older ICD-10 chapters or DSM-5-TR criteria text. For those, read the sources directly.

We build Kerrigan for substance use disorder (SUD) counselors.

**Request access through the form on the [LatentWorx home page](https://latentworx.com/).**

*This article explains classification. It is not clinical or billing advice. Diagnosis is the clinician's judgment. Verify code selection with your coder or billing lead, who also decides which codes a payer accepts and in what order.*
