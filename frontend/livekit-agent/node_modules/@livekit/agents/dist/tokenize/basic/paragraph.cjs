"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var paragraph_exports = {};
__export(paragraph_exports, {
  splitParagraphs: () => splitParagraphs
});
module.exports = __toCommonJS(paragraph_exports);
const splitParagraphs = (text) => {
  const re = /\n\s*\n/g;
  const splits = Array.from(text.matchAll(re));
  const paragraphs = [];
  let start = 0;
  if (splits.length === 0) {
    const stripped = text.trim();
    if (!stripped) return paragraphs;
    const start2 = text.indexOf(stripped);
    return [[stripped, start2, start2 + stripped.length]];
  }
  for (const split of splits) {
    const end = split.index;
    const paragraph = text.slice(start, end).trim();
    if (paragraph) {
      const paragraphStart = start + text.slice(start, end).indexOf(paragraph);
      const paragraphEnd = paragraphStart + paragraph.length;
      paragraphs.push([paragraph, paragraphStart, paragraphEnd]);
    }
    start = end + split[0].length;
  }
  const lastParagraph = text.slice(start).trim();
  if (lastParagraph) {
    const paragraphStart = start + text.slice(start).indexOf(lastParagraph);
    const paragraphEnd = paragraphStart + lastParagraph.length;
    paragraphs.push([lastParagraph, paragraphStart, paragraphEnd]);
  }
  return paragraphs;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  splitParagraphs
});
//# sourceMappingURL=paragraph.cjs.map