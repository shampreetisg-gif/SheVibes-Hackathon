---
name: API client DOM iterable types
description: Generated API client headers helpers require DOM iterable typings in the client library.
---

The generated React API client uses `Headers.entries()`, so its TypeScript library configuration must include both `dom` and `dom.iterable`.

**Why:** Codegen succeeds but the workspace library typecheck fails without the iterable DOM declarations.

**How to apply:** When regenerating the API client or adding a new generated browser client, confirm its tsconfig includes `dom.iterable`.