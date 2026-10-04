// Where a visitor came from, for self-serve sign-up attribution. Captured once
// per browser session on the very first page load (before client routing
// rewrites the URL) and sent with the register form; the API stores it on the
// company. Session-only, no cookies, nothing leaves the browser unless the
// person submits the sign-up form.
export const SIGNUP_SOURCE_KEY = 'byggexp.signupSource';

export const signupSourceBootScript = `(function(){try{var k='${SIGNUP_SOURCE_KEY}';if(sessionStorage.getItem(k))return;var q=new URLSearchParams(location.search),r=document.referrer||'';try{if(r&&new URL(r).hostname===location.hostname)r='';}catch(e){r='';}sessionStorage.setItem(k,JSON.stringify({utmSource:q.get('utm_source')||'',utmMedium:q.get('utm_medium')||'',utmCampaign:q.get('utm_campaign')||'',utmContent:q.get('utm_content')||'',utmTerm:q.get('utm_term')||'',referrer:r,landing:location.pathname+location.search}));}catch(e){}})();`;

// GA ids from the site's cookies (set on .byggexp.se after cookie consent), so
// the API's sign_up event joins the visitor's GA session. Empty without consent.
export function readGaIds(cookie = typeof document === 'undefined' ? '' : document.cookie) {
  const get = (name) => {
    const m = cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  };
  const ga = get('_ga').split('.');
  const gaClientId = ga.length >= 4 ? `${ga[2]}.${ga[3]}` : '';
  // _ga_<id>: "GS1.1.<session>.…" (old) or "GS2.1.s<session>$o…" (new).
  const sess = get('_ga_551T40R4WV');
  const m = sess.match(/^GS1\.\d+\.(\d+)/) || sess.match(/^GS2\.\d+\.s(\d+)/);
  return { gaClientId, gaSessionId: m ? m[1] : '' };
}

// GA ids are only sent when the visitor accepted analytics in our banner.
const analyticsAllowed = () => {
  try {
    return JSON.parse(localStorage.getItem('byggexp.consent.v1') || 'null')?.analytics === true;
  } catch {
    return false;
  }
};

export function readSignupSource() {
  let stored = {};
  try {
    stored = JSON.parse(sessionStorage.getItem(SIGNUP_SOURCE_KEY) || 'null') || {};
  } catch {
    stored = {};
  }
  return analyticsAllowed() ? { ...stored, ...readGaIds() } : stored;
}

const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

// Short label for the companies table: campaign > UTM > referrer > app/direct.
export function signupSourceLabel(src) {
  if (!src) return '';
  if (src.campaign) return src.campaign;
  if (src.utmSource) return [src.utmSource, src.utmMedium].filter(Boolean).join(' / ');
  const host = hostOf(src.referrer);
  if (host) return host;
  if (src.client === 'app') return 'App';
  return 'Direkt';
}
