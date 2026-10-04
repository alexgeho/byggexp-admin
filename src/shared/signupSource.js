// Where a visitor came from, for self-serve sign-up attribution. Captured once
// per browser session on the very first page load (before client routing
// rewrites the URL) and sent with the register form; the API stores it on the
// company. Session-only, no cookies, nothing leaves the browser unless the
// person submits the sign-up form.
export const SIGNUP_SOURCE_KEY = 'byggexp.signupSource';

export const signupSourceBootScript = `(function(){try{var k='${SIGNUP_SOURCE_KEY}';if(sessionStorage.getItem(k))return;var q=new URLSearchParams(location.search),r=document.referrer||'';try{if(r&&new URL(r).hostname===location.hostname)r='';}catch(e){r='';}sessionStorage.setItem(k,JSON.stringify({utmSource:q.get('utm_source')||'',utmMedium:q.get('utm_medium')||'',utmCampaign:q.get('utm_campaign')||'',utmContent:q.get('utm_content')||'',utmTerm:q.get('utm_term')||'',referrer:r,landing:location.pathname+location.search}));}catch(e){}})();`;

export function readSignupSource() {
  try {
    return JSON.parse(sessionStorage.getItem(SIGNUP_SOURCE_KEY) || 'null') || {};
  } catch {
    return {};
  }
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
