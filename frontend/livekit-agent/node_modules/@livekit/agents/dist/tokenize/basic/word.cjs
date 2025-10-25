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
var word_exports = {};
__export(word_exports, {
  splitWords: () => splitWords
});
module.exports = __toCommonJS(word_exports);
var import_tokenizer = require("../tokenizer.cjs");
const splitWords = (text, ignorePunctuation = true) => {
  const re = /\S+/g;
  const words = [];
  let arr;
  while ((arr = re.exec(text)) !== null) {
    let word = arr[0];
    const start = arr.index;
    const end = start + word.length;
    if (ignorePunctuation) {
      word = word.replace(new RegExp(`[${import_tokenizer.PUNCTUATIONS.join("")}]`, "g"), "");
    }
    words.push([word, start, end]);
  }
  return words;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  splitWords
});
//# sourceMappingURL=word.cjs.map