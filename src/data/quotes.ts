/**
 * Famous passages for practice mode: one passage per text, ending where it ends.
 *
 * Public domain only, leaning on fantasy, sci-fi and pop-culture classics: books, plays and poems
 * old enough to be out of copyright, and US government speeches. Modern franchises, movie lines
 * and song lyrics are left out on purpose, because they are still under copyright.
 *
 * Text is plain ASCII so it can be typed: dashes and curly quotes become commas and straight
 * quotes, and line breaks in poems become ordinary punctuation. Passages are 25+ words.
 */
export interface Quote {
  text: string;
  source: string;
}

export const QUOTES: Quote[] = [
  // science fiction
  {
    text: "No one would have believed in the last years of the nineteenth century that this world was being watched keenly and closely by intelligences greater than man's and yet as mortal as his own; that as men busied themselves about their various concerns they were scrutinised and studied, perhaps almost as narrowly as a man with a microscope might scrutinise the transient creatures that swarm and multiply in a drop of water.",
    source: 'H. G. Wells, The War of the Worlds (1898)',
  },
  {
    text: 'The Time Traveller (for so it will be convenient to speak of him) was expounding a recondite matter to us. His grey eyes shone and twinkled, and his usually pale face was flushed and animated. The fire burned brightly, and the soft radiance of the incandescent lights in the lilies of silver caught the bubbles that flashed and passed in our glasses.',
    source: 'H. G. Wells, The Time Machine (1895)',
  },
  {
    text: 'The stranger came early in February, one wintry day, through a biting wind and a driving snow, the last snowfall of the year, over the down, walking from Bramblehurst railway station, and carrying a little black portmanteau in his thickly gloved hand.',
    source: 'H. G. Wells, The Invisible Man (1897)',
  },
  {
    text: 'It was on a dreary night of November that I beheld the accomplishment of my toils. With an anxiety that almost amounted to agony, I collected the instruments of life around me, that I might infuse a spark of being into the lifeless thing that lay at my feet.',
    source: 'Mary Shelley, Frankenstein (1818)',
  },
  {
    text: 'We choose to go to the Moon in this decade and do the other things, not because they are easy, but because they are hard; because that goal will serve to organize and measure the best of our energies and skills.',
    source: 'John F. Kennedy, Rice University (1962)',
  },
  // weird and gothic
  {
    text: 'The most merciful thing in the world, I think, is the inability of the human mind to correlate all its contents. We live on a placid island of ignorance in the midst of black seas of infinity, and it was not meant that we should voyage far.',
    source: 'H. P. Lovecraft, The Call of Cthulhu (1928)',
  },
  {
    text: 'Once upon a midnight dreary, while I pondered, weak and weary, over many a quaint and curious volume of forgotten lore, while I nodded, nearly napping, suddenly there came a tapping, as of some one gently rapping, rapping at my chamber door.',
    source: 'Edgar Allan Poe, The Raven (1845)',
  },
  {
    text: "Marley was dead: to begin with. There is no doubt whatever about that. The register of his burial was signed by the clergyman, the clerk, the undertaker, and the chief mourner. Scrooge signed it: and Scrooge's name was good upon 'Change, for anything he chose to put his hand to.",
    source: 'Charles Dickens, A Christmas Carol (1843)',
  },
  // fantasy
  {
    text: "'Twas brillig, and the slithy toves did gyre and gimble in the wabe: all mimsy were the borogoves, and the mome raths outgrabe. 'Beware the Jabberwock, my son! The jaws that bite, the claws that catch! Beware the Jubjub bird, and shun the frumious Bandersnatch!'",
    source: 'Lewis Carroll, Jabberwocky (1871)',
  },
  {
    text: "Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, 'and what is the use of a book,' thought Alice, 'without pictures or conversations?'",
    source: "Lewis Carroll, Alice's Adventures in Wonderland (1865)",
  },
  {
    text: "Dorothy lived in the midst of the great Kansas prairies, with Uncle Henry, who was a farmer, and Aunt Em, who was the farmer's wife. Their house was small, for the lumber to build it had to be carried by wagon many miles.",
    source: 'L. Frank Baum, The Wonderful Wizard of Oz (1900)',
  },
  {
    text: 'All children, except one, grow up. They soon know that they will grow up, and the way Wendy knew was this. One day when she was two years old she was playing in a garden, and she plucked another flower and ran with it to her mother.',
    source: 'J. M. Barrie, Peter Pan (1911)',
  },
  {
    text: 'Now this is the Law of the Jungle, as old and as true as the sky; and the Wolf that shall keep it may prosper, but the Wolf that shall break it must die.',
    source: 'Rudyard Kipling, The Second Jungle Book (1895)',
  },
  {
    text: 'Double, double toil and trouble; fire burn, and cauldron bubble. Fillet of a fenny snake, in the cauldron boil and bake; eye of newt and toe of frog, wool of bat and tongue of dog.',
    source: 'William Shakespeare, Macbeth (c. 1606)',
  },
  {
    text: 'If we shadows have offended, think but this, and all is mended, that you have but slumbered here while these visions did appear. And this weak and idle theme, no more yielding but a dream, gentles, do not reprehend: if you pardon, we will mend.',
    source: "William Shakespeare, A Midsummer Night's Dream (c. 1595)",
  },
  {
    text: "Our revels now are ended. These our actors, as I foretold you, were all spirits and are melted into air, into thin air: and, like the baseless fabric of this vision, the cloud-capp'd towers, the gorgeous palaces, the solemn temples, the great globe itself, yea, all which it inherit, shall dissolve, and, like this insubstantial pageant faded, leave not a rack behind. We are such stuff as dreams are made on, and our little life is rounded with a sleep.",
    source: 'William Shakespeare, The Tempest (c. 1611)',
  },
  {
    text: "'Real isn't how you are made,' said the Skin Horse. 'It's a thing that happens to you. When a child loves you for a long, long time, not just to play with, but REALLY loves you, then you become Real.'",
    source: 'Margery Williams, The Velveteen Rabbit (1922)',
  },
  {
    text: 'Here is Edward Bear, coming downstairs now, bump, bump, bump, on the back of his head, behind Christopher Robin. It is, as far as he knows, the only way of coming downstairs, but sometimes he feels that there really is another way, if only he could stop bumping for a moment and think of it.',
    source: 'A. A. Milne, Winnie-the-Pooh (1926)',
  },
  // detectives and pop-culture classics
  {
    text: 'To Sherlock Holmes she is always the woman. I have seldom heard him mention her under any other name. In his eyes she eclipses and predominates the whole of her sex. It was not that he felt any emotion akin to love for Irene Adler.',
    source: 'Arthur Conan Doyle, A Scandal in Bohemia (1891)',
  },
  {
    text: "'You see, but you do not observe. The distinction is clear. For example, you have frequently seen the steps which lead up from the hall to this room.' 'Frequently.' 'How often?' 'Well, some hundreds of times.'",
    source: 'Arthur Conan Doyle, A Scandal in Bohemia (1891)',
  },
  {
    text: "In my younger and more vulnerable years my father gave me some advice that I've been turning over in my mind ever since. 'Whenever you feel like criticizing any one,' he told me, 'just remember that all the people in this world haven't had the advantages that you've had.'",
    source: 'F. Scott Fitzgerald, The Great Gatsby (1925)',
  },
  {
    text: 'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife. However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered as the rightful property of some one or other of their daughters.',
    source: 'Jane Austen, Pride and Prejudice (1813)',
  },
  {
    text: 'It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity, it was the season of Light, it was the season of Darkness, it was the spring of hope, it was the winter of despair.',
    source: 'Charles Dickens, A Tale of Two Cities (1859)',
  },
  {
    text: 'Call me Ishmael. Some years ago, never mind how long precisely, having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world.',
    source: 'Herman Melville, Moby-Dick (1851)',
  },
  {
    text: "To be, or not to be, that is the question: whether 'tis nobler in the mind to suffer the slings and arrows of outrageous fortune, or to take arms against a sea of troubles, and by opposing end them.",
    source: 'William Shakespeare, Hamlet (c. 1600)',
  },
];
