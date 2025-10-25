/** @internal */
export declare abstract class InferenceRunner<InputType = unknown, OutputType = unknown> {
    static registeredRunners: {
        [id: string]: string;
    };
    static registerRunner(method: string, importPath: string): void;
    abstract initialize(): Promise<void>;
    abstract run(data: InputType): Promise<OutputType>;
    abstract close(): Promise<void>;
}
//# sourceMappingURL=inference_runner.d.ts.map