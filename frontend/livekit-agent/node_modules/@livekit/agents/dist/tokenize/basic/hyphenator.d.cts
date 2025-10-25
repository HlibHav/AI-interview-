declare const END: unique symbol;
interface Tree {
    [id: string]: Tree | string;
    [END]?: number[];
}
declare class Hyphenator {
    #private;
    tree: Tree;
    exceptions: {
        [id: string]: number[];
    };
    constructor(patterns: string, exceptions: string);
    hyphenateWord(word: string): string[];
}
export declare const hyphenator: Hyphenator;
export {};
//# sourceMappingURL=hyphenator.d.ts.map