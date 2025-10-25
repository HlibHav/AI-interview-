import type { AudioFrame, VideoFrame } from '@livekit/rtc-node';
import { type ProviderFormat } from './provider_format/index.js';
import type { JSONObject, JSONValue, ToolContext } from './tool_context.js';
export type ChatRole = 'developer' | 'system' | 'user' | 'assistant';
export interface ImageContent {
    id: string;
    type: 'image_content';
    /**
     * Either a string URL or a VideoFrame object.
     */
    image: string | VideoFrame;
    inferenceDetail: 'auto' | 'high' | 'low';
    inferenceWidth?: number;
    inferenceHeight?: number;
    mimeType?: string;
    _cache: Record<any, any>;
}
export interface AudioContent {
    type: 'audio_content';
    frame: AudioFrame[];
    transcript?: string;
}
export type ChatContent = ImageContent | AudioContent | string;
export declare function createImageContent(params: {
    image: string | VideoFrame;
    id?: string;
    inferenceDetail?: 'auto' | 'high' | 'low';
    inferenceWidth?: number;
    inferenceHeight?: number;
    mimeType?: string;
}): ImageContent;
export declare function createAudioContent(params: {
    frame: AudioFrame[];
    transcript?: string;
}): AudioContent;
export declare class ChatMessage {
    readonly id: string;
    readonly type: "message";
    readonly role: ChatRole;
    content: ChatContent[];
    interrupted: boolean;
    hash?: Uint8Array;
    createdAt: number;
    constructor(params: {
        role: ChatRole;
        content: ChatContent[] | string;
        id?: string;
        interrupted?: boolean;
        createdAt?: number;
    });
    static create(params: {
        role: ChatRole;
        content: ChatContent[] | string;
        id?: string;
        interrupted?: boolean;
        createdAt?: number;
    }): ChatMessage;
    /**
     * Returns a single string with all text parts of the message joined by new
     * lines. If no string content is present, returns `null`.
     */
    get textContent(): string | undefined;
    toJSONContent(): JSONValue[];
    toJSON(excludeTimestamp?: boolean): JSONValue;
}
export declare class FunctionCall {
    readonly id: string;
    readonly type: "function_call";
    callId: string;
    args: string;
    name: string;
    createdAt: number;
    constructor(params: {
        callId: string;
        name: string;
        args: string;
        id?: string;
        createdAt?: number;
    });
    static create(params: {
        callId: string;
        name: string;
        args: string;
        id?: string;
        createdAt?: number;
    }): FunctionCall;
    toJSON(excludeTimestamp?: boolean): JSONValue;
}
export declare class FunctionCallOutput {
    readonly id: string;
    readonly type: "function_call_output";
    name: string;
    callId: string;
    output: string;
    isError: boolean;
    createdAt: number;
    constructor(params: {
        callId: string;
        output: string;
        isError: boolean;
        id?: string;
        createdAt?: number;
        name?: string;
    });
    static create(params: {
        callId: string;
        output: string;
        isError: boolean;
        id?: string;
        createdAt?: number;
        name?: string;
    }): FunctionCallOutput;
    toJSON(excludeTimestamp?: boolean): JSONValue;
}
export type ChatItem = ChatMessage | FunctionCall | FunctionCallOutput;
export declare class ChatContext {
    protected _items: ChatItem[];
    constructor(items?: ChatItem[]);
    static empty(): ChatContext;
    get items(): ChatItem[];
    set items(items: ChatItem[]);
    /**
     * Add a new message to the context and return it.
     */
    addMessage(params: {
        role: ChatRole;
        content: ChatContent[] | string;
        id?: string;
        interrupted?: boolean;
        createdAt?: number;
    }): ChatMessage;
    /**
     * Insert a single item or multiple items based on their `createdAt` field so
     * that the array keeps its chronological order.
     */
    insert(item: ChatItem | ChatItem[]): void;
    getById(itemId: string): ChatItem | undefined;
    indexById(itemId: string): number | undefined;
    copy(options?: {
        excludeFunctionCall?: boolean;
        excludeInstructions?: boolean;
        excludeEmptyMessage?: boolean;
        toolCtx?: ToolContext<any>;
    }): ChatContext;
    truncate(maxItems: number): ChatContext;
    toJSON(options?: {
        excludeImage?: boolean;
        excludeAudio?: boolean;
        excludeTimestamp?: boolean;
        excludeFunctionCall?: boolean;
    }): JSONObject;
    toProviderFormat(format: ProviderFormat, injectDummyUserMessage?: boolean): Promise<Record<string, any>[] | [Record<string, any>[], import("./provider_format/google.js").GoogleFormatData]>;
    /**
     * Internal helper used by `truncate` & `addMessage` to find the correct
     * insertion index for a timestamp so the list remains sorted.
     */
    private findInsertionIndex;
    /**
     * Indicates whether the context is read-only
     */
    get readonly(): boolean;
}
export declare class ReadonlyChatContext extends ChatContext {
    static readonly errorMsg = "Please use .copy() and agent.update_chat_ctx() to modify the chat context.";
    constructor(items: ChatItem[]);
    get items(): ChatItem[];
    set items(items: ChatItem[]);
    get readonly(): boolean;
}
//# sourceMappingURL=chat_context.d.ts.map