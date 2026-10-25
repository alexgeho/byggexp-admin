# ByggExp Presentationer

Short instruction decks about one ByggExp feature each, for a customer's office (bookkeeper, site manager, owner). One deck = one flow from the first setting to the result. Slides are 1920×1080, Swedish, the site's brand.

## Content

- Short and to the point. Every word must help the reader do the step. If a line can go, it goes.
- Read it as someone who opens the deck for the first time: each step says what to do in one plain sentence.
- An instruction, not a sales pitch: no "questions for you", no "next steps" slides.
- A deck has 5–7 slides: cover → **Så går flödet** (4 step cards) → one slide per step → result (example file, table or screen).
- Swedish for customers. Real names and real numbers from demo data (Byggavtalet fördelningstal always in percent: 100% / 88% / 70%). Nothing invented.
- Crossed out by the owner = gone from every slide and every later deck.

## Visual foundations

- Colours: only byggexp.se tokens (`src/styles/globals.scss`): white ground (#FFFFFF, no light-blue slide backgrounds), `ink` text, `blue` #2394FF, `green` #45B36B for step balls. Accent `amber` #FFA62B only inside illustrations, about 10% of the picture (chair, clock, mug, hard hat); never for text or UI. No template colours, no other blue.
- Type: the font byggexp.se actually renders — system SF Pro (`-apple-system`, Segoe UI on Windows, Inter as web fallback). Headings tracked tight like the site: h1/h2 -0.02em, h2 weight 500, step titles 600 -0.015em. **Heading small, content big**: `slide-heading` 36px in `ink`, the steps, screenshots and numbers carry the slide.
- Air: `slide-pad-x` 160px, `slide-pad-y` 112px. Nothing glued to the edge.
- Proximity: eyebrow and heading are one group (12px), the gap to content is larger (`space-4`).
- No decoration nobody asked for: no pills, badges, gradients, emoji.

## Owner rules (every remark = rule; check ALL before showing)

1. Every owner remark goes into this list at once and is applied to every deck, slide, note and the admin — not only where it was pointed out. Anything crossed out disappears everywhere.
2. Short: one plain sentence per step, title + action. No extra words, no decoration nobody asked for.
3. Slide heading small, content (steps, screenshots, numbers) big. Step number ball next to the title, title on one line.
4. Colours only from byggexp.se: ink #0A1828, blue #2394FF, green #45B36B (step balls), amber #FFA62B only inside illustrations. White backgrounds, 1px #E1EAF3 card borders.
5. Font = what byggexp.se renders: system SF Pro. Headings tight (-0.02em).
6. Breadcrumbs: grey #94A8BC (site muted-2, a bit paler than body text #5B7591), one colour, regular weight, plain ›. Never blue, never black, never bold.
7. Explanations under steps: muted #5B7591 (like the site).
8. Byggavtalet fördelningstal always in percent: 100% / 88% / 70%. Never 1,00 / 0,88 / 0,70. Step text says just «fördelningstal».
9. Admin Lönekategori = exactly 3 options with the percent.
10. Show the real product (screenshot), never a home-made table in a big font next to a screenshot. Never the same field twice on a slide.
11. Screenshots readable: crop to what matters; one 3px blue highlight on the element the step is about.
12. App screens: the newest design from the simulator, in the phone frame (phone-frame.py).
13. Illustrations: soft 3D clay from the approved 2D scene, people smile, heads on a neck, real logos pasted (Fortnox), green check balls like the site.
14. No attestation anywhere.
15. Slides look like byggexp.se sections: background #F1F6FB; content in white cards (1px #E1EAF3 border, radius 32px); centred head = blue uppercase eyebrow (22px, 600, tracking .12em, e.g. «Steg 1» / «Så fungerar det») + h2 (52–56px, weight 500, -0.02em, ink, key words may be blue). Card titles ink 600. Cover stays dark like the site hero. No red «pain» blocks.

## Components

- **StepCard**: Recraft illustration on a white `radius-lg` card with a 1px `line` border → green number ball (44px, title 28px, `green` on `green-soft`, like the site's step bullets) + title on ONE line, `space-1` between → breadcrumb → one muted sentence. Four in a row, all aligned.
- **Breadcrumb**: plain text, grey `#94A8BC` (paler than body text), one colour, regular weight, plain `›`. Under the step heading.
- **Screenshot**: cropped to the part that matters, readable on the slide, `radius-md` with `line` border. Exactly one highlight: a 3px `blue` outline around the element the step is about.
- **ExampleTable**: 3 lines only (top, under the header, bottom), no zebra, numbers right-aligned, tabular, one precision per column, a muted label column on the right. One person per table.

## Illustrations (Recraft)

Drawn in Recraft, never stock. One style across all decks: soft 3D clay render (matte, rounded, soft studio light, soft shadow), white background, `ink`, site `blue` #2394FF, white/light grey and one or two `amber` #FFA62B accents, no text, no currency symbols. Make 3D from the approved 2D picture (Recraft image-to-image, the 2D picture as reference 1) so the scene stays the same. People are smiling, sitting at a computer or holding a phone; a worker wears a hard hat. Base prompt:

> Recreate reference image 1 exactly - same scene, same composition, same pose and camera angle - but as a modern soft 3D render: smooth matte clay material, rounded shapes, soft studio lighting, gentle soft shadow, pure white background. Colors only navy #0A1828, sky blue #2394FF, white, light grey, and one or two small warm amber #FFA62B accents. No text, no letters, no numbers, no currency symbols: …

Third-party logos (Fortnox) are never drawn by AI: ask for an empty rounded badge and paste the real logo.

## Iconography

None in slides. Breadcrumb arrows are the text glyph `›`.
