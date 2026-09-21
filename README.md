
# Zousan-plus 🐘➕
A small collection of super useful utility functions for managing complex async behavior with promises

## Deprecated

Zousan-plus is no longer under development. The repository and published package will remain available so existing users are not broken.

Zousan 4.3.0 includes the maintained workflow helpers as side-effect-free imports:

```javascript
import { evaluate, evaluateResults } from "zousan/evaluate"
import { series } from "zousan/series"
```

`map`, `namedAll`, `promisify`, `promisifyFn`, and `tSeries` have no direct replacement in Zousan. Use the standard Promise API or a focused library if you still need that behavior.

---

The legacy documentation remains available at https://github.com/bluejava/zousan-plus.
