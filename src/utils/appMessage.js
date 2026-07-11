import { message as staticMessage } from 'antd';

let messageApi = staticMessage;

export function bindAppMessage(api) {
  messageApi = api;
}

export const appMessage = {
  success: (...args) => messageApi.success(...args),
  error: (...args) => messageApi.error(...args),
  warning: (...args) => messageApi.warning(...args),
  info: (...args) => messageApi.info(...args),
};
