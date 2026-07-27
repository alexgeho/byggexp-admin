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

export const appMessage = {
  success: (content, ...rest) => messageApi.success(tr(content), ...rest),
  error: (content, ...rest) => messageApi.error(tr(content), ...rest),
  warning: (content, ...rest) => messageApi.warning(tr(content), ...rest),
  info: (content, ...rest) => messageApi.info(tr(content), ...rest),
};
