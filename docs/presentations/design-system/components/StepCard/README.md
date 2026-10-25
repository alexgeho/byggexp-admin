# StepCard

One step of a flow on the "Så går flödet" slide: illustration, number and one-line title, breadcrumb, one plain sentence.

- Four cards in a row, 382px wide, `space-2` apart; all parts sit at the same height in every card.
- Number in `blue`, same size as the title (`step-title`), 10px (`space-1`) before it. The title never wraps: shorten the words instead.
- Breadcrumb right under the title, then the explanation in `muted`.
- Illustration from Recraft (see README), on a `card` square with `radius-lg`.
- The consumer provides the image, the four texts and the breadcrumb parts.
