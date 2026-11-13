/**
 * Famous lines for practice mode.
 *
 * Public domain only: books and plays old enough to be out of copyright, speeches and words
 * by US government officials or NASA crews (US government works), traditional songs and rhymes,
 * proverbs, and films that are in the public domain. Modern movie lines and song lyrics are
 * left out on purpose, because they are still under copyright.
 *
 * Text is plain ASCII so it can be typed: dashes and curly quotes are written as commas and
 * straight quotes, and line breaks in poems and songs become ordinary punctuation.
 */
export interface Quote {
  text: string;
  source: string;
}

export const QUOTES: Quote[] = [
  // books
  { text: 'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.', source: 'Jane Austen, Pride and Prejudice (1813)' },
  { text: 'I declare after all there is no enjoyment like reading!', source: 'Jane Austen, Pride and Prejudice (1813)' },
  { text: 'It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness.', source: 'Charles Dickens, A Tale of Two Cities (1859)' },
  { text: 'Happy families are all alike; every unhappy family is unhappy in its own way.', source: 'Leo Tolstoy, Anna Karenina (1878)' },
  { text: 'Call me Ishmael. Some years ago, never mind how long precisely, having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world.', source: 'Herman Melville, Moby-Dick (1851)' },
  { text: "'Curiouser and curiouser!' cried Alice.", source: "Lewis Carroll, Alice's Adventures in Wonderland (1865)" },
  { text: "'Begin at the beginning,' the King said, very gravely, 'and go on till you come to the end: then stop.'", source: "Lewis Carroll, Alice's Adventures in Wonderland (1865)" },
  { text: "Why, sometimes I've believed as many as six impossible things before breakfast.", source: 'Lewis Carroll, Through the Looking-Glass (1871)' },
  { text: 'The only way to get rid of a temptation is to yield to it.', source: 'Oscar Wilde, The Picture of Dorian Gray (1890)' },
  { text: 'We are all in the gutter, but some of us are looking at the stars.', source: "Oscar Wilde, Lady Windermere's Fan (1892)" },
  { text: 'When you have eliminated the impossible, whatever remains, however improbable, must be the truth.', source: 'Arthur Conan Doyle, The Sign of Four (1890)' },
  { text: 'Come, Watson, come! The game is afoot.', source: 'Arthur Conan Doyle, The Adventure of the Abbey Grange (1904)' },
  { text: 'Beware; for I am fearless, and therefore powerful.', source: 'Mary Shelley, Frankenstein (1818)' },
  { text: "I'm not afraid of storms, for I'm learning how to sail my ship.", source: 'Louisa May Alcott, Little Women (1868)' },
  { text: "Isn't it nice to think that tomorrow is a new day with no mistakes in it yet?", source: 'L. M. Montgomery, Anne of Green Gables (1908)' },
  { text: 'Believe me, my young friend, there is nothing, absolutely nothing, half so much worth doing as simply messing about in boats.', source: 'Kenneth Grahame, The Wind in the Willows (1908)' },
  { text: 'All children, except one, grow up.', source: 'J. M. Barrie, Peter Pan (1911)' },
  { text: 'There is no place like home.', source: 'L. Frank Baum, The Wonderful Wizard of Oz (1900)' },
  { text: 'I went to the woods because I wished to live deliberately, to front only the essential facts of life, and see if I could not learn what it had to teach.', source: 'Henry David Thoreau, Walden (1854)' },
  { text: 'Whenever you find yourself on the side of the majority, it is time to pause and reflect.', source: "Mark Twain, notebook (1904)" },
  // plays and poems
  { text: 'To be, or not to be: that is the question.', source: 'William Shakespeare, Hamlet (c. 1600)' },
  { text: 'There is nothing either good or bad, but thinking makes it so.', source: 'William Shakespeare, Hamlet (c. 1600)' },
  { text: "All the world's a stage, and all the men and women merely players; they have their exits and their entrances, and one man in his time plays many parts.", source: 'William Shakespeare, As You Like It (c. 1599)' },
  { text: 'We are such stuff as dreams are made on, and our little life is rounded with a sleep.', source: 'William Shakespeare, The Tempest (c. 1611)' },
  { text: 'Hope is the thing with feathers that perches in the soul, and sings the tune without the words, and never stops at all.', source: 'Emily Dickinson (c. 1861)' },
  { text: "I wandered lonely as a cloud that floats on high o'er vales and hills, when all at once I saw a crowd, a host, of golden daffodils.", source: 'William Wordsworth (1807)' },
  { text: 'Two roads diverged in a wood, and I, I took the one less traveled by, and that has made all the difference.', source: 'Robert Frost, The Road Not Taken (1916)' },
  // speeches and spaceflight (US government works)
  { text: 'Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal.', source: 'Abraham Lincoln, Gettysburg Address (1863)' },
  { text: 'The only thing we have to fear is fear itself.', source: 'Franklin D. Roosevelt, inaugural address (1933)' },
  { text: 'Ask not what your country can do for you; ask what you can do for your country.', source: 'John F. Kennedy, inaugural address (1961)' },
  { text: "That's one small step for man, one giant leap for mankind.", source: 'Neil Armstrong, Apollo 11 (1969)' },
  { text: "Houston, we've had a problem.", source: 'Apollo 13 crew (1970)' },
  // songs and rhymes
  { text: 'Twinkle, twinkle, little star, how I wonder what you are! Up above the world so high, like a diamond in the sky.', source: 'Jane Taylor, The Star (1806)' },
  { text: 'Row, row, row your boat, gently down the stream. Merrily, merrily, merrily, merrily, life is but a dream.', source: 'Traditional song (1852)' },
  { text: "Take me out to the ball game, take me out with the crowd; buy me some peanuts and Cracker Jack, I don't care if I never get back.", source: 'Jack Norworth, Take Me Out to the Ball Game (1908)' },
  { text: "Daisy, Daisy, give me your answer do. I'm half crazy all for the love of you.", source: 'Harry Dacre, Daisy Bell (1892)' },
  // films in the public domain
  { text: "They're coming to get you, Barbara.", source: 'Night of the Living Dead (1968)' },
  { text: 'The mediator between the head and the hands must be the heart.', source: 'Metropolis (1927)' },
  // proverbs and philosophers
  { text: 'A journey of a thousand miles begins with a single step.', source: 'Laozi, Tao Te Ching' },
  { text: 'I think, therefore I am.', source: 'Rene Descartes (1637)' },
  { text: 'Fortune favors the bold.', source: 'Latin proverb' },
];
