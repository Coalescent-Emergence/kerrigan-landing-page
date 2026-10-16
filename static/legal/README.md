# /legal/ — agreement documents the app loads

`baa.md` and `qsoa.md` in this directory are byte-for-byte copies of
`LatentWorx-Beck/legal/clickthrough/{baa,qsoa}.md`. **These two files are what
customers accept.** Editing one and merging that change changes the agreement
for every existing customer, who must re-accept it before their next
recording (see that repo's `clickthrough/README.md`).

The Kerrigan app rejects a document that still contains any `[[OWNER_...]]`
marker, so the copies here will not be shown to any customer until the
founder's values from `clickthrough/OWNER-VALUES.md` are filled in and these
files are re-copied.

Served two ways from this one source:
- Raw markdown at `/legal/baa.md` and `/legal/qsoa.md` (this directory, via
  Hugo's `static/`).
- Human-readable pages at `/legal/baa/` and `/legal/qsoa/`
  (`content/legal/baa.md`, `content/legal/qsoa.md`, rendered by
  `layouts/legal/single.html`, which calls Hugo's `readFile` on the files in
  this directory and renders that same markdown — there is no second copy of
  the agreement text in the content files).

To update: copy the new `baa.md`/`qsoa.md` from the `legal` repo's
`clickthrough/` directory over the two files in this directory, verify with
`sha256sum`, and open a PR. Do not hand-edit the agreement text here.
