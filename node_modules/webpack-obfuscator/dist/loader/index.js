"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const javascript_obfuscator_1 = __importDefault(require("javascript-obfuscator"));
const estraverse_1 = __importDefault(require("estraverse"));
const loader_utils_1 = __importDefault(require("loader-utils"));
const acorn = __importStar(require("acorn"));
class WebpackObfuscatorLoaderHelper {
    static getCommentedSource(sourceCode) {
        const entries = [];
        const astTree = WebpackObfuscatorLoaderHelper.parseCode(sourceCode);
        estraverse_1.default.traverse(astTree, {
            enter: (node) => {
                if (WebpackObfuscatorLoaderHelper.isRequire(node) && node.start && node.end) {
                    entries.push({
                        start: node.start,
                        end: node.end,
                    });
                }
            }
        });
        let commentedSource = sourceCode.slice();
        entries
            .sort((a, b) => b.end - a.end)
            .forEach((n) => {
            const before = commentedSource.slice(0, n.start);
            const mid = commentedSource.slice(n.start, n.end);
            const after = commentedSource.slice(n.end);
            commentedSource = `${before}/* javascript-obfuscator:disable */${mid}/* javascript-obfuscator:enable */${after}`;
        });
        return commentedSource;
    }
    static parseCode(sourceCode) {
        const sourceTypeLength = WebpackObfuscatorLoaderHelper.sourceTypes.length;
        for (let i = 0; i < sourceTypeLength; i++) {
            try {
                return WebpackObfuscatorLoaderHelper.parseType(sourceCode, WebpackObfuscatorLoaderHelper.sourceTypes[i]);
            }
            catch (error) {
                if (i < sourceTypeLength - 1) {
                    continue;
                }
                throw new Error(error);
            }
        }
        throw new Error('Acorn parsing error');
    }
    static parseType(sourceCode, sourceType) {
        const config = {
            sourceType,
            ecmaVersion: 11
        };
        return acorn.parse(sourceCode, config);
    }
    static isRequire(node) {
        return node.type === 'CallExpression'
            && node.callee.type === 'Identifier'
            && node.callee.name === 'require';
    }
}
WebpackObfuscatorLoaderHelper.sourceTypes = [
    'script',
    'module'
];
function Loader(sourceCode) {
    const options = loader_utils_1.default.getOptions(this) || {};
    const commentedSourceCode = WebpackObfuscatorLoaderHelper.getCommentedSource(sourceCode);
    const obfuscationResult = javascript_obfuscator_1.default.obfuscate(commentedSourceCode, options);
    return obfuscationResult.getObfuscatedCode();
}
module.exports = Loader;
