# Why `prebuild` deletes the ESLint cache

`npm run build` fails on a warm cache with two warnings that are not true:

```
src\components\ledger\CustomerLedgerView.jsx
  Line 97:10:  'downloading' is assigned a value but never used  no-unused-vars

src\components\trading\TradingReports.jsx
  Line 5:3:  'Button' is defined but never used  no-unused-vars
```

Neither is real, and it takes ten seconds to prove:

- `downloading` is read three times in that file — lines 269, 273 and 276, on the
  Statement PDF button's spinner, its `disabled` and its label
- `Button` is never imported into `TradingReports.jsx` at all. The file imports
  `IconButton`. Line 5, which the warning points at, is `Chip`

Linting the two files directly settles it:

```bash
npx eslint --no-cache src/components/ledger/CustomerLedgerView.jsx \
                      src/components/trading/TradingReports.jsx
# no output, exit 0
```

So the files are clean and `node_modules/.cache/.eslintcache` is serving results that
belong to older versions of them. The cache is keyed on path plus mtime, and an mtime
that does not move when content does — a checkout, a branch switch, a restored file —
leaves an entry that outlives the code it described.

**Why it breaks the build rather than just being noise.** `react-scripts build` sets
`CI=true` on any CI server, and CRA turns warnings into errors when `CI` is set:

```
Treating warnings as errors because process.env.CI = true.
Failed to compile.
```

So a stale cache entry is a failed deployment, for code that is correct.

`prebuild` deletes the one cache file before every build. It costs a few seconds of
re-linting and it means the build's verdict is about the code in the tree rather than
about what a cache remembers. The jest and babel caches are left alone — only ESLint's
is involved, and only its results are replayed this way.

Deleting the cache by hand also works (`rm node_modules/.cache/.eslintcache`) but relies
on somebody knowing, which is exactly the knowledge that goes missing when a build fails
at six in the morning.
