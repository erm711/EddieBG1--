const BUILD_ID = '177981b1219';
const AUTH_PAGE_URL = `https://cdn.registerdisney.go.com/v2/TPR-WDW-LBSDK.IOS-PROD/en-US?include=l10n,config,html,js&buildId=${BUILD_ID}`;

interface PartialMessage {
  eventName: string;
  data: unknown;
  deferredUuid?: string;
}

interface Message extends PartialMessage {
  type: 'message';
}

interface DeferrableMessage extends Message {
  deferredUuid: string;
}

interface Deferred {
  type: 'deferred';
  deferredUuid: string;
  action: 'resolve' | 'reject';
  data: unknown;
}

interface Handshake {
  type: 'handshake';
}

interface HandshakeAck {
  type: 'handshakeAck';
}

type Sendable = Message | Deferred | Handshake | HandshakeAck;

type SendableHandler = (data: any) => unknown;

function isDeferrable(sendable: Sendable): sendable is DeferrableMessage {
  return 'deferredUuid' in sendable && sendable.deferredUuid !== undefined;
}

export class AuthClient {
  protected handlers: Record<string, SendableHandler | null> = {};

  constructor(
    protected iframe: HTMLIFrameElement,
    onLogin: (token: string, expires: Date) => void
  ) {
    this.on('handshake', () => {
      this.send({ type: 'handshakeAck' });
      if ((import.meta as any).env.DEV) {
        this.sendMessage('setLogLevel', { level: 'log' });
      }
      this.sendMessage('workflow.run', { name: 'login' });
    });
    this.on('lightbox.hide', () => this.open());
    this.on('session.loggedin', ({ token }) => {
      onLogin(token.access_token, new Date(token.expires));
    });
  }

  open(): void {
    addEventListener('message', this.onMessage);
    this.iframe.src = AUTH_PAGE_URL.toString();
  }

  close(): void {
    removeEventListener('message', this.onMessage);
  }

  on(typeOrEventName: string, handler: SendableHandler): void {
    this.handlers[typeOrEventName] = handler;
  }

  sendMessage(eventName: string, data: unknown): void {
    this.send({ type: 'message', eventName, data });
  }

  protected onMessage = (event: MessageEvent<any>): void => {
    if (event.source !== this.iframe.contentWindow) return;
    if (event.data === 'inner.loaded') return;
    const message = JSON.parse(event.data) as Sendable;
    if ((import.meta as any).env.DEV) console.log('Message:', message);
    const name = message.type === 'message' ? message.eventName : message.type;
    const handler = this.handlers[name];
    if (handler) {
      const result = handler('data' in message ? message.data : null);
      if (isDeferrable(message) && result !== undefined) {
        this.resolve(message, result);
      }
    } else if (handler === undefined) {
      if (isDeferrable(message)) this.resolve(message, {});
    }
  };

  protected resolve(message: DeferrableMessage, result: unknown): void {
    this.send({
      type: 'deferred',
      action: 'resolve',
      deferredUuid: message.deferredUuid,
      data: result,
    });
  }

  protected send(sendable: Sendable): void {
    this.iframe.contentWindow?.postMessage(
      JSON.stringify({
        ...sendable,
        name: 'lightbox-client-window',
      }),
      AUTH_PAGE_URL
    );
  }
}
