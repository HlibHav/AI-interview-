import { PUNCTUATIONS } from "../tokenizer.js";
const splitWords = (text, ignorePunctuation = true) => {
  const re = /\S+/g;
  const words = [];
  let arr;
  while ((arr = re.exec(text)) !== null) {
    let word = arr[0];
    const start = arr.index;
    const end = start + word.length;
    if (ignorePunctuation) {
      word = word.replace(new RegExp(`[${PUNCTUATIONS.join("")}]`, "g"), "");
    }
    words.push([word, start, end]);
  }
  return words;
};
export {
  splitWords
};
//# sourceMappingURL=word.js.map