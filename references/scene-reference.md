# Scene reference

Every scene accepts the shared fields below, plus the type-specific props.

```yaml
- type: statement            # required
  narration: "Spoken text."  # optional; omit for silent scenes
  tone: light                # light | dark | accent
  backdrop: plain            # plain | grid | glow | sunset | aurora | none
  chapter: "The mechanism"   # small label, top right
  transition: { type: fade, duration: 0.45 }
  duration: 12               # seconds; minimum for narrated, exact for silent
  min_duration: 4.5          # optional floor
  pause_before: 0.3          # extra silence before narration
  pause_after: 0.6           # extra hold after narration
  voice: edge-warm-male      # per-scene voice override
  speed: 0.98                # per-scene TTS speed
  captions: false            # per-scene caption switch
```

The builder adds ~0.9 s of lead-in and ~0.6 s of tail to every narrated scene, plus the transition duration. Do not add those yourself.

Global audio lives at the top of the storyboard:

```yaml
music:
  mood: curious            # curious | cinematic | playful | (or path: assets/bed.mp3)
  volume: 0.5
  duck: 0.55               # level under narration

sfx:
  enabled: true
  set: soft                # soft | cinematic | none
  volume: 0.6
```

Per-scene cues:

```yaml
sfx:
  - { at: 1.2, name: pop, volume: 0.5 }
  - { at: 4.8, name: tick, volume: 0.4 }
```

`at` is seconds from the scene start. Available names: `whoosh`, `pop`, `tick`, `impact`, `riser`.

---

## title

Cold open. Large serif display, sunset/aurora backdrop, brand metadata.

```yaml
- type: title
  tone: dark
  backdrop: sunset
  kicker: "Episode 01 · Light"
  title: "Why is the sky *blue*?"
  subtitle: "The three-minute answer hiding inside ordinary sunlight."
  season: "Episode 01"
  runtime: "3 min"
  narration: >
    Look up. On a clear day the sky is blue, but the air around you is
    completely invisible. So where does the colour come from?
```

- `title` ≤ 8 words per line, 2 lines max at 132 px.
- Use `*italic*` for one accent word; do not bold the whole title.
- `sunset` needs `tone: dark`; `aurora` needs `tone: dark`.
- Keep narration to 1–3 sentences. The scene is the hook, not the lecture.

## chapter

Part break. Huge outlined number, a re-hook line, one supporting sentence.

```yaml
- type: chapter
  tone: light
  backdrop: grid
  number: "02"
  kicker: "Part two"
  title: "Now tilt the sun."
  subtitle: "The same physics, a much longer path, and a completely different sky."
  narration: "Now tilt the sun. The same physics is about to paint the sunset."
```

- Use every 4–7 minutes in long videos.
- `number` is a string so `"01"` keeps its leading zero.
- One sentence of narration at most; the visual carries the beat.

## statement

One idea, centred, word-by-word reveal.

```yaml
- type: statement
  tone: light
  kicker: "Start here"
  text: "Sunlight looks white, but it is actually **every colour** at once."
  footnote: "Visible light · 380–750 nanometres"
  align: center            # center | left
  size: 82                 # optional, 64–96
```

- ≤ 22 words.
- Bold at most 2–3 words with `**...**`.
- `footnote` is small mono text — use for a unit, a date, or a caveat.

## bullets

3–5 parallel points with a sticky left title.

```yaml
- type: bullets
  tone: dark
  kicker: "Foundations"
  title: "Light is a wave"
  items:
    - title: "Wavelength is colour"
      detail: "About 450 nanometres for blue; around 700 for red."
    - title: "Small obstacles still scatter"
      detail: "Air molecules are far smaller than the waves passing through them."
  note: "Optional small note under the left column."
```

- Item titles ≤ 5 words; details ≤ 18 words.
- 3 or 4 items work best; 5 is the maximum.
- Reveals are distributed across 58% of the scene, so narration should follow the same order.

## steps

Ordered process, vertical stepper with a progress line.

```yaml
- type: steps
  tone: dark
  kicker: "The recipe"
  title: "How a sunset is made"
  steps:
    - title: "Low angle"
      detail: "Sunlight enters the atmosphere almost horizontally."
    - title: "Blue is removed"
      detail: "Short wavelengths scatter out of the long beam."
    - title: "Warm light survives"
      detail: "Orange and red reach your eye."
```

- 3–5 steps.
- Use for recipes, algorithms, historical sequences with causality.
- Pair each step with a short narration clause ("First… Second… Third…").

## compare

Two panels facing each other with a VS badge and optional verdict.

```yaml
- type: compare
  tone: light
  kicker: "Same light, different journey"
  title: "Noon vs sunset"
  left:
    label: "Midday"
    title: "A short path"
    subtitle: "The sun is overhead."
    points:
      - "Thin slice of atmosphere"
      - "Blue arrives from every direction"
  right:
    label: "Sunset"
    title: "A long path"
    subtitle: "The sun is near the horizon."
    points:
      - "Many times more air"
      - "Orange and red survive"
  verdict: "The sunset is the light that was left behind."
```

- ≤ 3 points per side, ≤ 10 words each.
- `left` uses the primary accent, `right` the secondary.
- Keep the two sides structurally parallel (same number of points).

## stat

One number, made physical. Optional comparison bars fill the right side.

```yaml
- type: stat
  tone: accent
  kicker: "The number to remember"
  value: 5.5
  decimals: 1
  suffix: "×"
  label: "more blue light is scattered than red"
  detail: "Across a hundred kilometres of atmosphere, that ratio becomes the sky."
  source: "Rayleigh scattering · 450 nm vs 700 nm"
  bars:
    - { label: "Red", value: 1 }
    - { label: "Blue", value: 5.5 }
```

- `value` is numeric; `prefix`/`suffix` are strings ("$", "×", "%").
- Count-up starts immediately; place the number in the narration too.
- `bars` is optional, max 3, values relative to each other.
- Use `tone: accent` once per video at most.

## chart

Animated bar or line chart, hand-built SVG (no chart library).

```yaml
- type: chart
  tone: light
  kicker: "Scattering strength"
  title: "Short waves scatter far more"
  variant: bar              # bar | line
  unit: "×"
  highlightIndex: 4
  note: "Relative Rayleigh scattering"
  data:
    - { label: "Red", value: 1 }
    - { label: "Orange", value: 1.5 }
    - { label: "Blue", value: 5.5 }
  footnote: "Air molecules redirect short wavelengths more strongly."
```

- 4–7 data points. Labels ≤ 10 characters.
- `highlightIndex` is 0-based; use it for the point you are arguing about.
- `max` overrides the auto y-scale (useful for truncated axes — label them).
- `variant: line` is for change over time; bars for comparison.

## diagram

Mechanism or flow: HTML cards over an SVG edge layer.

```yaml
- type: diagram
  tone: dark
  kicker: "The mechanism"
  title: "One beam, thousands of redirections"
  layout: row               # row | cycle | stack
  nodes:
    - { id: sun, label: "Sunlight", sublabel: "Every colour" }
    - { id: air, label: "Air molecules", sublabel: "N₂ and O₂" }
    - { id: eye, label: "Your eye", sublabel: "Blue from everywhere" }
  edges:
    - { from: sun, to: air, label: "white light" }
    - { from: air, to: eye, label: "scattered blue" }
  footnote: "Rayleigh scattering · intensity ∝ 1 / wavelength⁴"
```

- 3–5 nodes. `row` for pipelines, `cycle` for loops, `stack` for hierarchies.
- `id` values must match edge endpoints.
- Edge labels ≤ 3 words. Too many labels becomes spaghetti.
- Nodes use a fixed 290×132 px card; keep labels short.

## timeline

Horizontal history with years and event cards.

```yaml
- type: timeline
  tone: dark
  kicker: "How we figured it out"
  title: "Three scientists, one sky"
  events:
    - when: "1666"
      title: "Newton splits the light"
      detail: "A prism shows white light is a mixture."
    - when: "1869"
      title: "Tyndall sees blue"
      detail: "Fine particles scatter short wavelengths."
  footnote: "Scattered intensity ∝ 1 / wavelength⁴"
```

- 3–5 events, chronological.
- `when` ≤ 6 characters (year, "Before", "Today").
- Details ≤ 14 words.

## quote

A real quotation, set in display serif.

```yaml
- type: quote
  tone: dark
  text: "The sky is not blue. It is sunlight, scattered."
  author: "Lord Rayleigh"
  role: "On the scattering of light, 1871"
```

- Only use verifiable quotations. If unsure, use `statement` with no attribution.
- ≤ 40 words.
- `role` can hold the source/date.

## image

Full-bleed or inset photo with Ken Burns motion.

```yaml
- type: image
  tone: dark
  kicker: "From orbit"
  src: assets/earth.jpg     # relative to the storyboard folder
  caption: "The atmosphere is a thin blue line."
  credit: "NASA / ISS"
  variant: inset            # inset | full
  focus: center             # left | center | right
```

- Local paths are copied into the Remotion public folder automatically.
- Use 16:9 images ≥ 1920×1080. `full` crops aggressively; keep the subject central.
- Always credit the source.
- `inset` is 1680×660 with a rounded frame; good for maps and screenshots.

## code

Syntax-highlighted, line-by-line reveal with optional highlighted lines.

```yaml
- type: code
  tone: light
  kicker: "The loop"
  title: "Three lines that do the work"
  filename: explain.py
  language: python
  highlightLines: [4, 5]
  code: |
    for photon in sunlight:
        if photon.wavelength < 500:
            sky.scatter(photon)
```

- ≤ 14 lines. ≤ 70 characters per line at the default 24 px.
- Supported highlighting: python, javascript, typescript, bash.
- Long code should be split across multiple scenes, not shrunk.

## recap

Checklist summary, optionally with a CTA pill.

```yaml
- type: recap
  tone: light
  kicker: "Recap"
  title: "Four steps, one sky"
  items:
    - "White sunlight contains every colour."
    - "Air scatters short wavelengths most strongly."
    - "Blue reaches your eye from every direction."
  cta: "Watch the next episode"
```

- 3–5 items, one line each (≤ 16 words).
- More than 4 items switch to a two-column grid.
- Place immediately before the outro.

## outro

Subscribe / next-episode card.

```yaml
- type: outro
  tone: dark
  backdrop: aurora
  kicker: "One last thing"
  title: "The sky is a physics experiment."
  subtitle: "It runs every day, for free, wherever you happen to be standing."
  pills: ["Subscribe", "Next: why the ocean is blue"]
  next: "Why is the ocean blue?"
```

- One clear CTA, one next-video tease. Not three.
- `pills` are static UI chips; the first is filled with the accent.
- Keep `title` ≤ 10 words.

## map

Animated route over a generated map. The map image and the route overlay share the same
Mercator projection, so points land exactly where they should.

```yaml
- type: map
  tone: dark
  kicker: "Leg two"
  title: "Seattle to Reno, via nowhere"
  src: assets/maps/pnw-dark.svg
  bounds: [-131, 33, -109, 50]       # west, south, east, north
  points:
    - { lat: 45.59, lon: -122.60, label: "Portland", note: "2:50 pm", kind: "origin", leg: 1, hideLabel: true, hideDot: true }
    - { lat: 47.45, lon: -122.31, label: "Seattle", note: "7:40 pm", kind: "stop", leg: 1, dx: 26, dy: -44 }
    - { lat: 45.90, lon: -122.75, label: "Jump zone", note: "8:13 pm", kind: "jump", leg: 2, dx: -40, dy: 8 }
    - { lat: 39.50, lon: -119.77, label: "Reno", note: "11:02 pm", kind: "end", leg: 2, dx: 26, dy: 26 }
  footnote: "Approximate route. The exact jump zone remains disputed."
```

- `leg: 1` is drawn as a dim dashed context line; `leg: 2` is the animated bright route.
- `kind`: `origin`, `stop`, `jump`, `end` — `jump` gets a pulsing red marker and a "JUMP" badge.
- `dx`/`dy` nudge labels in map pixels. Negative `dx` right-aligns the label to the left of the point.
- `hideLabel` / `hideDot` declutter points that are close together.
- Generate the base map with `python -m videoforge.maps`; the default PNW map uses `bounds: [-131, 33, -109, 50]`.
- Longitude/latitude are real; routes should be approximate and labelled as such.

## flight

A stylised 727 with a deploying aft airstair and a descending parachutist. Use it for the
action beat, not as a technical diagram.

```yaml
- type: flight
  tone: dark
  kicker: "8:13 pm · Southwest Washington"
  title: "The rear stairs were down."
  tail: "BOEING 727-51 · N467US"
  altitude: "10,000 FT · 8:13 PM"
  note: "At 8:00 pm a warning light showed the aft airstair was down."
```

- Animation: aircraft enters, airstair extends, a figure appears at the door, the parachute descends, the plane drifts on.
- `note` is a small mono line bottom-left. Keep it under 18 words so it clears the captions.
- The scene is illustrative; label it as such in the episode or description.

## portrait

A case-file / archive portrait: image on the left, identity and facts on the right.

```yaml
- type: portrait
  tone: light
  kicker: "The suspect"
  name: "Dan Cooper"
  alias: "The press called him D. B. Cooper"
  image: assets/cooper-sketch.jpg
  facts:
    - { label: "Age", value: "Mid-40s" }
    - { label: "Height", value: "5'10\"–6'0\"" }
    - { label: "Weight", value: "170–180 lb" }
  note: "Witnesses agreed on the description, but no one agreed on a name."
  credit: "FBI composite · 1972"
```

- Use a portrait-orientation image (roughly 2:3). It is cropped to the card.
- `facts` is a two-column grid; 4–6 entries work best.
- The card gets a scan line, a paper frame and an "UNSOLVED" stamp automatically.
- Always credit the image. Public-domain FBI composites are a good source for 20th-century cases.

## evidence

Three artefact cards with vector icons and evidence tags.

```yaml
- type: evidence
  tone: light
  kicker: "What was left behind"
  title: "Three objects, one mystery"
  items:
    - { title: "The tie", detail: "A black J.C. Penney clip-on, left in seat 18E.", tag: "SEAT 18E", icon: "tie" }
    - { title: "The money", detail: "Three packets of twenties surfaced in 1980.", tag: "TENA BAR · 1980", icon: "money" }
    - { title: "The parachute", detail: "He jumped with two. One reserve was sewn shut.", tag: "ONE SEWN SHUT", icon: "parachute" }
  footnote: "FBI NORJAK evidence · illustrations"
```

- Icons: `tie`, `money`, `parachute`. Unknown icons fall back to the tie.
- Three cards is the intended rhythm; two or four also lay out.
- `tag` is a small pill — a location, date or evidence number.
- Details should be one sentence; the cards do not scroll.

---

## Copy-length cheat sheet

| Element | Safe maximum |
|---------|--------------|
| Title display | 8 words / line, 2 lines |
| Statement | 22 words |
| Bullet title | 5 words |
| Bullet detail | 18 words |
| Compare point | 10 words |
| Chart label | 10 characters |
| Diagram node label | 3 words |
| Diagram edge label | 3 words |
| Timeline detail | 14 words |
| Caption chunk | 68 characters (automatic) |

When in doubt, cut. The render cannot reflow text like a web page.
