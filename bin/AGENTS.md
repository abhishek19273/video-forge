# bin/

`vf` is a thin launcher:

```bash
exec "$ROOT/.venv/bin/python" -m videoforge "$@"
```

Keep it path-relative. Do not add project-specific logic, absolute paths, or API keys.
