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
var sentence_exports = {};
__export(sentence_exports, {
  splitSentences: () => splitSentences
});
module.exports = __toCommonJS(sentence_exports);
const splitSentences = (text, minLength = 20, retainFormat = false) => {
  const alphabets = /([A-Za-z])/g;
  const prefixes = /(Mr|St|Mrs|Ms|Dr)[.]/g;
  const suffixes = /(Inc|Ltd|Jr|Sr|Co)/g;
  const starters = /(Mr|Mrs|Ms|Dr|Prof|Capt|Cpt|Lt|He\s|She\s|It\s|They\s|Their\s|Our\s|We\s|But\s|However\s|That\s|This\s|Wherever)/g;
  const acronyms = /([A-Z][.][A-Z][.](?:[A-Z][.])?)/g;
  const websites = /[.](com|net|org|io|gov|edu|me)/g;
  const digits = /([0-9])/g;
  const dots = /\.{2,}/g;
  if (retainFormat) {
    text = text.replaceAll("\n", "<nel><stop>");
  } else {
    text = text.replaceAll("\n", " ");
  }
  text = text.replaceAll(prefixes, "$1<prd>");
  text = text.replaceAll(websites, "<prd>$2");
  text = text.replaceAll(new RegExp(`${digits.source}[.]${digits.source}`, "g"), "$1<prd>$2");
  text = text.replaceAll(dots, (match) => "<prd>".repeat(match.length));
  text = text.replaceAll("Ph.D.", "Ph<prd>D<prd>");
  text = text.replaceAll(new RegExp(`\\s${alphabets.source}[.] `, "g"), " $1<prd> ");
  text = text.replaceAll(new RegExp(`${acronyms.source} ${starters.source}`, "g"), "$1<stop> $2");
  text = text.replaceAll(
    new RegExp(`${alphabets.source}[.]${alphabets.source}[.]${alphabets.source}[.]`, "g"),
    "$1<prd>$2<prd>$3<prd>"
  );
  text = text.replaceAll(
    new RegExp(`${alphabets.source}[.]${alphabets.source}[.]`, "g"),
    "$1<prd>$2<prd>"
  );
  text = text.replaceAll(
    new RegExp(` ${suffixes.source}[.] ${starters.source}`, "g"),
    "$1<stop> $2"
  );
  text = text.replaceAll(new RegExp(` ${suffixes.source}[.]`, "g"), "$1<prd>");
  text = text.replaceAll(new RegExp(` ${alphabets.source}[.]`, "g"), "$1<prd>");
  text = text.replaceAll(".\u201D", "\u201D.");
  text = text.replaceAll('."', '".');
  text = text.replaceAll('!"', '"!');
  text = text.replaceAll('?"', '"?');
  text = text.replaceAll(".", ".<stop>");
  text = text.replaceAll("?", "?<stop>");
  text = text.replaceAll("!", "!<stop>");
  text = text.replaceAll("<prd>", ".");
  if (retainFormat) {
    text = text.replaceAll("<nel>", "\n");
  }
  const split = text.split("<stop>");
  text = text.replaceAll("<stop>", "");
  const sentences = [];
  let buf = "";
  let start = 0;
  let end = 0;
  const prePad = retainFormat ? "" : " ";
  for (const match of split) {
    const sentence = retainFormat ? match : match.trim();
    if (!sentence) continue;
    buf += prePad + sentence;
    end += match.length;
    if (buf.length > minLength) {
      sentences.push([buf.slice(prePad.length), start, end]);
      start = end;
      buf = "";
    }
  }
  if (buf) {
    sentences.push([buf.slice(prePad.length), start, text.length - 1]);
  }
  return sentences;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  splitSentences
});
//# sourceMappingURL=sentence.cjs.map