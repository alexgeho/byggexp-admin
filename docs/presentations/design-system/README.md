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

- Colours: only byggexp.se tokens (`src/styles/globals.scss`): white ground (#FFFFFF, no light-blue slide backgrounds), `ink` text, `blue` #2394FF, `green` #45B36B for step balls. Accent `amber` #FFA62B only inside illustrations, about 10% of the picture (chair, clock, mug, hard hat); never for text or UI. No template colours, no other blue.
- Type: the font byggexp.se actually renders — system SF Pro (`-apple-system`, Segoe UI on Windows, Inter as web fallback). Headings tracked tight like the site: h1/h2 -0.02em, h2 weight 500, step titles 600 -0.015em. **Heading small, content big**: `slide-heading` 36px muted, the steps, screenshots and numbers carry the slide.
- Air: `slide-pad-x` 160px, `slide-pad-y` 112px. Nothing glued to the edge.
- Proximity: eyebrow and heading are one group (12px), the gap to content is larger (`space-4`).
- No decoration nobody asked for: no pills, badges, gradients, emoji.

## Components

- **StepCard**: Recraft illustration on a white `radius-lg` card with a 1px `line` border → green number ball (44px, title 28px, `green` on `green-soft`, like the site's step bullets) + title on ONE line, `space-1` between → breadcrumb → one muted sentence. Four in a row, all aligned.
- **Breadcrumb**: plain text. `Appen`/`Adminpanelen`/`Fortnox Lön` bold › muted middle › bold last item. Arrows in `blue`. Green number ball (44px) before it on step slides.
- **Screenshot**: cropped to the part that matters, readable on the slide, `radius-md` with `line` border. Exactly one highlight: a 3px `blue` outline around the element the step is about.
- **ExampleTable**: 3 lines only (top, under the header, bottom), no zebra, numbers right-aligned, tabular, one precision per column, a muted label column on the right. One person per table.

## Illustrations (Recraft)

Drawn in Recraft, never stock. One style across all decks: soft 3D clay render (matte, rounded, soft studio light, soft shadow), white background, `ink`, site `blue` #2394FF, white/light grey and one or two `amber` #FFA62B accents, no text, no currency symbols. Make 3D from the approved 2D picture (Recraft image-to-image, the 2D picture as reference 1) so the scene stays the same. People are smiling, sitting at a computer or holding a phone; a worker wears a hard hat. Base prompt:

> Recreate reference image 1 exactly - same scene, same composition, same pose and camera angle - but as a modern soft 3D render: smooth matte clay material, rounded shapes, soft studio lighting, gentle soft shadow, pure white background. Colors only navy #0A1828, sky blue #2394FF, white, light grey, and one or two small warm amber #FFA62B accents. No text, no letters, no numbers, no currency symbols: …

Third-party logos (Fortnox) are never drawn by AI: ask for an empty rounded badge and paste the real logo.

## Iconography

None in slides. Breadcrumb arrows are the text glyph `›`.
