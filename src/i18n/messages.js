// Translation dictionaries keyed by the English source string. `t(s)` returns
// the value for the active language, otherwise falls back to the English source,
// so untranslated strings degrade gracefully. Each language lives in its own
// module under ./messages/ — add entries there, keep this file as the index.
import { sv } from './messages/sv';
import { nb } from './messages/nb';

export const dictionaries = { sv, nb };
