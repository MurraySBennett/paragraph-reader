import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { writeFile } from 'node:fs/promises';

const story = `Once when a Lion was asleep a little Mouse began running up and down upon him; this soon wakened the Lion, who placed his huge paw upon him, and opened his big jaws to swallow him. “Pardon, O King,” cried the little Mouse: “forgive me this time, I shall never forget it: who knows but what I may be able to do you a turn some of these days?” The Lion was so tickled at the idea of the Mouse being able to help him, that he lifted up his paw and let him go. Some time after the Lion was caught in a trap, and the hunters who desired to carry him alive to the King, tied him to a tree while they went in search of a waggon to carry him on. Just then the little Mouse happened to pass by, and seeing the sad plight in which the Lion was, went up to him and soon gnawed away the ropes that bound the King of the Beasts. “Was I not right?” said the little Mouse.`;
const doc = new Document({
  creator: 'Paragraph Reader',
  title: 'The Lion and the Mouse',
  description: 'Aesop fable retold by Joseph Jacobs, packaged as a Word reading example.',
  sections: [{ properties: {}, children: [
    new Paragraph({ text: 'The Lion and the Mouse', heading: HeadingLevel.TITLE, spacing: { after: 280 } }),
    new Paragraph({ children: [new TextRun({ text: 'Aesop · retold by Joseph Jacobs', italics: true })], spacing: { after: 280 } }),
    new Paragraph({ text: story, spacing: { after: 260 }, style: 'Normal' }),
    new Paragraph({ children: [new TextRun({ text: 'Little friends may prove great friends.', italics: true })], spacing: { after: 320 } }),
    new Paragraph({ children: [new TextRun({ text: 'Source: The Fables of Aesop (1894), Project Gutenberg ebook 28. Public domain in the United States.', size: 18 })] }),
  ] }],
});
await writeFile(new URL('../samples/lion-and-mouse.docx', import.meta.url), await Packer.toBuffer(doc));
