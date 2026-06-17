# Blocked-file templates

The ChatGPT/GitHub connector blocked direct creation of two executable-looking files:

- `index.html`
- `src/gpu/wgsl/validationSmoke.wgsl`

Their exact contents are stored in safe Markdown templates in this folder:

- `index-html.md`
- `validationSmoke-wgsl.md`

Manual/local promotion step:

1. Copy the content from each template.
2. Create the real file at the target path listed in the template.
3. Run:

```bash
npm install
npm run dev
npm test
```

These templates are temporary until the files can be materialized by a local filesystem or a less restrictive write path.
