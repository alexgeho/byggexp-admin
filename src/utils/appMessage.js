import { message as staticMessage } from 'antd';

let messageApi = staticMessage;
let translate = (s) => s;

export function bindAppMessage(api) {
  messageApi = api;
}

// Lets the app localise toast strings globally: the LanguageProvider binds the
// current t(), and every string toast content is translated by its English
// source before display.
export function bindAppTranslator(fn) {
  translate = typeof fn === 'function' ? fn : ((s) => s);
}

const tr = (content) => (typeof content === 'string' ? translate(content) : content);

// A role/permission mismatch on a background read (the backend RolesGuard/
// permissions message) is never actionable by the user — screens are already
// gated by capability — so we never toast it. This kills the "Access denied.
// Required roles: …" nag that delegated roles (projectAdmin) would otherwise see
// from overview widgets, no matter which store fires it.
const isAuthorizationNoise = (content) =>
  typeof content === 'string' && /required roles:/i.test(content);

export const appMessage = {
  success: (content, ...rest) => messageApi.success(tr(content), ...rest),
  error: (content, ...rest) => {
    if (isAuthorizationNoise(content)) return undefined;
    return messageApi.error(tr(content), ...rest);
  },
  warning: (content, ...rest) => messageApi.warning(tr(content), ...rest),
  info: (content, ...rest) => messageApi.info(tr(content), ...rest),
};
