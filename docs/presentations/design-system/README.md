# ByggExp Presentationer

Short instruction decks about one ByggExp feature each, for a customer's office (bookkeeper, site manager, owner). One deck = one flow from the first setting to the result. Slides are 1920×1080, Swedish, the site's brand.

## Content

- Short and to the point. Every word must help the reader do the step. If a line can go, it goes.
- Read it as someone who opens the deck for the first time: each step says what to do in one plain sentence.
- An instruction, not a sales pitch: no "questions for you", no "next steps" slides.
- A deck has 5–7 slides: cover → **Så går flödet** (4 step cards) → one slide per step → result (example file, table or screen).
- Swedish for customers. Real names and real numbers from demo data (Byggavtalet rates: 203 kr grundlön, 0,88 → 179, 0,70 → 142,10). Nothing invented.
- Crossed out by the owner = gone from every slide and every later deck.

## Visual foundations

- Colours: only the site's tokens, `bg` ground, `ink` text, one accent `blue`. No template colours.
- Type: DM Sans. **Heading small, content big**: `slide-heading` 36px muted, the steps, screenshots and numbers carry the slide.
- Air: `slide-pad-x` 160px, `slide-pad-y` 112px. Nothing glued to the edge.
- Proximity: eyebrow and heading are one group (12px), the gap to content is larger (`space-4`).
- No decoration nobody asked for: no pills, badges, gradients, emoji.

## Components

- **StepCard**: Recraft illustration on a white `radius-lg` card → number (blue, same size as title) + title on ONE line, `space-1` between → breadcrumb → one muted sentence. Four in a row, all aligned.
- **Breadcrumb**: plain text. `Appen`/`Adminpanelen`/`Fortnox Lön` bold › muted middle › bold last item. Arrows in `blue`. `Steg N&nbsp;·&nbsp;` before it on step slides.
- **Screenshot**: cropped to the part that matters, readable on the slide, `radius-md` with `line` border. Exactly one highlight: a 3px `blue` outline around the element the step is about.
- **ExampleTable**: 3 lines only (top, under the header, bottom), no zebra, numbers right-aligned, tabular, one precision per column, a muted label column on the right. One person per table.

## Illustrations (Recraft)

Drawn in Recraft, never stock. One character style across all decks: flat vector, minimal line art with solid fills, white background, only `ink`, `blue` and white, no text, no currency symbols. People are smiling, sitting at a computer or holding a phone; a worker wears a hard hat. Base prompt:

> Flat vector character illustration, minimal line art with solid fills, white background, only colors navy #0A1828, blue #2394FF and white, no text, no letters, no dollar signs, no currency symbols: …

Third-party logos (Fortnox) are never drawn by AI: ask for an empty rounded badge and paste the real logo.

## Iconography

None in slides. Breadcrumb arrows are the text glyph `›`.
