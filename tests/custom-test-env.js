import JSDOMEnvironment from 'jest-environment-jsdom';

export default class CustomTestEnvironment extends JSDOMEnvironment {
  constructor(...args) {
    super(...args);
    this.global.fetch = fetch;
    this.global.Headers = Headers;
    this.global.Request = Request;
    this.global.Response = Response;
    this.global.AbortSignal = AbortSignal;
    this.global.AbortController = AbortController;
    this.global.TextEncoder = TextEncoder;
    this.global.TextDecoder = TextDecoder;
    this.global.ReadableStream = ReadableStream;
  }
}
