import { WebSocket } from 'ws';
export type AnyString = string & NonNullable<unknown>;
export declare function createAccessToken(apiKey: string, apiSecret: string, ttl?: number): Promise<string>;
export declare function connectWs(url: string, headers: Record<string, string>, timeoutMs: number): Promise<WebSocket>;
//# sourceMappingURL=utils.d.ts.map