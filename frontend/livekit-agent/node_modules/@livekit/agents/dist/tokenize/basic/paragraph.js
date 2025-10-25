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
export {
  splitParagraphs
};
//# sourceMappingURL=paragraph.js.map