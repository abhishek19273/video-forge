# python/

Python package root for `videoforge`.

- `videoforge/cli.py` defines the `vf` commands.
- Dependencies are listed in `requirements.txt`.
- Do not hardcode absolute paths or secrets.
- Keep the builder deterministic: same storyboard + cache → same timings.
