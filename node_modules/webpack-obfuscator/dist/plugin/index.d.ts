import { Compiler } from 'webpack';
import { ObfuscatorOptions } from 'javascript-obfuscator';
export declare class WebpackObfuscatorPlugin {
    options: ObfuscatorOptions;
    static readonly loader: string;
    private static readonly baseIdentifiersPrefix;
    excludes: string[];
    constructor(options?: ObfuscatorOptions, excludes?: string | string[]);
    apply(compiler: Compiler): void;
    private shouldExclude;
    private extractSourceAndSourceMap;
    private obfuscate;
}
