import type { ChatItem } from '../llm/index.js';
import type { Task } from '../utils.js';
export declare class SpeechHandle {
    private _id;
    private _allowInterruptions;
    /** @internal */
    _stepIndex: number;
    readonly parent?: SpeechHandle | undefined;
    /** Priority for messages that should be played after all other messages in the queue */
    static SPEECH_PRIORITY_LOW: number;
    /** Every speech generates by the VoiceAgent defaults to this priority. */
    static SPEECH_PRIORITY_NORMAL: number;
    /** Priority for important messages that should be played before others. */
    static SPEECH_PRIORITY_HIGH: number;
    private interruptFut;
    private authorizedEvent;
    private scheduledFut;
    private doneFut;
    private generations;
    /** @internal */
    _tasks: Task<void>[];
    private _chatItems;
    private _numSteps;
    private itemAddedCallbacks;
    private doneCallbacks;
    constructor(_id: string, _allowInterruptions: boolean, 
    /** @internal */
    _stepIndex: number, parent?: SpeechHandle | undefined);
    static create(options?: {
        allowInterruptions?: boolean;
        stepIndex?: number;
        parent?: SpeechHandle;
    }): SpeechHandle;
    get interrupted(): boolean;
    get numSteps(): number;
    get id(): string;
    get scheduled(): boolean;
    get allowInterruptions(): boolean;
    /**
     * Allow or disallow interruptions on this SpeechHandle.
     *
     * When set to false, the SpeechHandle will no longer accept any incoming
     * interruption requests until re-enabled. If the handle is already
     * interrupted, clearing interruptions is not allowed.
     *
     * @param value - true to allow interruptions, false to disallow
     * @throws Error If attempting to disable interruptions when already interrupted
     */
    set allowInterruptions(value: boolean);
    done(): boolean;
    get chatItems(): ChatItem[];
    /**
     * Interrupt the current speech generation.
     *
     * @throws Error If this speech handle does not allow interruptions.
     *
     * @returns The same speech handle that was interrupted.
     */
    interrupt(force?: boolean): SpeechHandle;
    /**
     * Waits for the entire assistant turn to complete playback.
     *
     * This method waits until the assistant has fully finished speaking,
     * including any finalization steps beyond initial response generation.
     * This is appropriate to call when you want to ensure the speech output
     * has entirely played out, including any tool calls and response follow-ups.
     */
    waitForPlayout(): Promise<void>;
    waitIfNotInterrupted(aw: Promise<unknown>[]): Promise<void>;
    addDoneCallback(callback: (sh: SpeechHandle) => void): void;
    removeDoneCallback(callback: (sh: SpeechHandle) => void): void;
    /** @internal */
    _cancel(): SpeechHandle;
    /** @internal */
    _authorizeGeneration(): void;
    /** @internal */
    _clearAuthorization(): void;
    /** @internal */
    _waitForAuthorization(): Promise<void>;
    /** @internal */
    _waitForGeneration(stepIdx?: number): Promise<void>;
    /** @internal */
    _waitForScheduled(): Promise<void>;
    /** @internal */
    _markGenerationDone(): void;
    /** @internal */
    _markDone(): void;
    /** @internal */
    _markScheduled(): void;
    /** @internal */
    _addItemAddedCallback(callback: (item: ChatItem) => void): void;
    /** @internal */
    _removeItemAddedCallback(callback: (item: ChatItem) => void): void;
    /** @internal */
    _itemAdded(items: ChatItem[]): void;
}
//# sourceMappingURL=speech_handle.d.ts.map