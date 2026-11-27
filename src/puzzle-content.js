// SERVER-SIDE ONLY (src/ is excluded from the public assets by .assetsignore).
// Passwords and answers are checked here and never sent to a browser.

function parseGrid(s) {
  return s.trim().split('\n').map((line) =>
    line.split(/\s+/).filter((t) => t && t !== '|').map((t) => (/\d/.test(t) ? Number(t) : t === '.' ? 0 : t))
  );
}

// ---- Matching helpers -------------------------------------------------------
// Answers: trim, lowercase, strip punctuation and the/a/an. Separators (: / -) become spaces
// so "1:1", "1-1" and "1/1" all read the same.
function norm(s) {
  s = String(s == null ? '' : s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
  s = s.replace(/(\d)\.0+(?!\d)/g, '$1');
  s = s.replace(/[:\/\\\-–—_]/g, ' ').replace(/[^a-z0-9\s]/g, '');
  return s.split(/\s+/).filter((w) => w && w !== 'the' && w !== 'a' && w !== 'an').join(' ');
}
// Passwords: ignore case, spaces, dashes, brackets and any other punctuation.
function normPw(s) {
  return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ---- Clue sheets (shown to everyone) ------------------------------------------
const CLUES = [
  { id: 'f15', label: 'Q 1 & 5', kind: 'text', text: 'NO PASSWORD' },
  {
    id: 'f210', label: 'Q 2 & 10', kind: 'sudoku',
    grid: parseGrid(`
5 . 9 | 4 . . | . . B
. . 3 | . . D | 6 9 .
. 1 . | . . . | . . 5
C 5 . | 1 8 . | . . .
3 . . | . 5 . | . E 7
. . . | . 9 6 | . 5 .
9 . . | A . . | . 7 .
. 3 8 | . . . | 5 . .
. . . | . . 7 | 1 . 3`),
  },
  {
    id: 'f39', label: 'Q 3 & 9', kind: 'sudoku',
    grid: parseGrid(`
E 7 . | . 2 . | . 4 6
. 6 . | . A . | 8 9 .
2 . . | 8 . . | 7 1 5
. 8 4 | . 9 7 | . . .
7 1 . | . . B | . 5 9
. C . | 1 3 . | 4 8 .
6 9 7 | . . 2 | . . 8
. 5 8 | . . . | D 6 .
4 3 . | . 8 . | . 7 .`),
  },
  { id: 'f46', label: 'Q 4 & 6', kind: 'text', text: "WATERVAL COUNTRY LODGE'S LANDLINE NUMBER" },
  {
    id: 'f712', label: 'Q 7 & 12', kind: 'sudoku',
    grid: parseGrid(`
. . 1 | 3 . 2 | D . .
. A 3 | . . 7 | . 4 5
. . 7 | . . . | . . 9
. . 6 | 5 . . | . 7 .
2 . . | . . . | . B 1
. 9 . | . . 1 | 4 . .
5 . . | . . . | 9 . .
6 1 . | 2 C . | 8 . E
. . . | 9 . 8 | 5 . .`),
  },
  {
    id: 'f811', label: 'Q 8 & 11', kind: 'text',
    // Wording kept EXACTLY as supplied. Do not tidy.
    text: 'MINUS YOUR ANSWER FROM Q 7 & 2 FROM YOUR ANSWER IN Q 2 & 10 THIS WILL BE THE PASSWORD FOR Q 8 & 11',
  },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ---- Locked files -----------------------------------------------------------------
const FILES = [
  {
    id: 'f15', label: 'Q 1 & 5', questions: ['Q1', 'Q5'],
    passwords: ['nopassword'],
    note: 'Type the exact words from the clue sheet.',
  },
  { id: 'f210', label: 'Q 2 & 10', questions: ['Q2', 'Q10'], passwords: ['81221'] },
  { id: 'f39', label: 'Q 3 & 9', questions: ['Q3', 'Q9'], passwords: ['58228'] },
  {
    id: 'f46', label: 'Q 4 & 6', questions: ['Q4', 'Q6'],
    // Waterval Country Lodge landline 021 001 3680 (also accepted with the +27 prefix).
    passwords: ['0210013680', '27210013680'],
  },
  { id: 'f712', label: 'Q 7 & 12', questions: ['Q7', 'Q12'], passwords: ['29774'] },
  { id: 'f811', label: 'Q 8 & 11', questions: ['Q8', 'Q11'], passwords: ['51447'] }, // 81221 - 29774
];

// ---- Questions ----------------------------------------------------------------------
const QUESTIONS = {
  Q1: { text: 'What is Cynophobia the fear of?', type: 'text', accept: ['dog', 'dogs'] },
  Q5: {
    text: 'What animal breathes out of its butt?', type: 'text',
    accept: ['turtle', 'turtles', 'sea cucumber', 'sea cucumbers', 'fitzroy river turtle'],
  },
  Q2: {
    text: 'What does a funambulist walk on?', type: 'text',
    accept: ['tightrope', 'tight rope', 'high wire', 'highwire', 'wire', 'rope', 'tight-rope'],
  },
  Q10: {
    text: 'A girl meets a lion and unicorn in the forest. The lion lies every Monday, Tuesday and Wednesday and the other days he speaks the truth. The unicorn lies on Thursdays, Fridays and Saturdays, and the other days of the week he speaks the truth. "Yesterday I was lying," the lion told the girl. "So was I," said the unicorn. What day is it?',
    type: 'day', options: DAYS, accept: ['thursday'],
  },
  Q3: { text: 'What was the original name of the search engine "Google"?', type: 'text', accept: ['backrub', 'back rub'] },
  Q9: {
    text: "You're rummaging around your great grandmother's attic when you find five short chains each made of four gold links. It occurs to you that if you combined them all into one big loop of 20 links, you'd have an incredible necklace. So you bring it to a jeweller, who tells you the cost of making the necklace will be $10 for each gold link that she has to break and then reseal. How much will it cost?",
    type: 'text', accept: ['40', '$40', 'forty', '40 dollars'],
  },
  Q4: {
    text: 'Nephelococcygia is the practice of doing what?', type: 'text',
    match: 'contains', accept: ['cloud'],
  },
  Q6: {
    text: 'What is measured in "Mickeys"?', type: 'text',
    match: 'contains', accept: ['mouse', 'mice'],
  },
  Q7: { text: 'Find the smallest even four-digit number written with four different digits.', type: 'text', accept: ['1024'] },
  Q12: {
    text: 'The elevator can carry no more than 6 adults or no more than 9 children. What is the maximum number of children that can get into the elevator with 2 adults?',
    type: 'text', accept: ['6', 'six'],
  },
  Q8: {
    text: "King Nupe of the kingdom Catan dotes on his two daughters so much that he decides the kingdom would be better off with more girls than boys, and he makes the following decree: All child-bearing couples must continue to bear children until they have a daughter! But to avoid overpopulation, he makes an additional decree: All child-bearing couples will stop having children once they have a daughter! His subjects immediately begin following his orders. After many years, what's the expected ratio of girls to boys in Catan?",
    type: 'text',
    accept: ['1:1', '1', '1/1', '1 to 1', '1-1', 'equal', '50/50', 'one to one', 'even', '1 girl to 1 boy'],
  },
  Q11: {
    text: 'There are three people (Alex, Ben and Cody), one of whom is a knight, one a knave, and one a spy. The knight always tells the truth, the knave always lies, and the spy can either lie or tell the truth. Alex says: "Cody is a knave." Ben says: "Alex is a knight." Cody says: "I am the spy." Who is the knight, who the knave, and who the spy?',
    type: 'trio', people: ['Alex', 'Ben', 'Cody'], options: ['Knight', 'Knave', 'Spy'],
    correct: { Alex: 'Knight', Ben: 'Spy', Cody: 'Knave' },
  },
};
const QUESTION_ORDER = FILES.flatMap((f) => f.questions); // 12 in total

const normAccept = {};
for (const [id, q] of Object.entries(QUESTIONS)) if (q.accept) normAccept[id] = q.accept.map(norm);

function checkAnswer(qid, answer) {
  const q = QUESTIONS[qid];
  if (!q) return false;
  if (q.type === 'trio') {
    if (!answer || typeof answer !== 'object') return false;
    return q.people.every((p) => answer[p] === q.correct[p]);
  }
  const n = norm(answer);
  if (!n) return false;
  if (q.match === 'contains') return normAccept[qid].some((a) => n.includes(a));
  return normAccept[qid].includes(n);
}
function checkPassword(fileId, pw) {
  const f = FILES.find((x) => x.id === fileId);
  if (!f) return false;
  const n = normPw(pw);
  return n.length > 0 && f.passwords.includes(n);
}
// Readable text for a submitted answer (shown back to the team once it is locked in)
function shownAnswer(qid, answer) {
  const q = QUESTIONS[qid];
  if (q.type === 'trio') return q.people.map((p) => `${p}: ${answer[p]}`).join(' · ');
  return String(answer).trim().slice(0, 80);
}

// Facilitator reference only (served behind the facilitator PIN)
function answerKey() {
  return FILES.map((f) => ({
    file: f.label,
    password: f.id === 'f46' ? '021 001 3680' : f.id === 'f15' ? 'NO PASSWORD' : f.passwords[0],
    questions: f.questions.map((qid) => {
      const q = QUESTIONS[qid];
      return {
        id: qid,
        text: q.text,
        answer: q.type === 'trio' ? q.people.map((p) => `${p} = ${q.correct[p]}`).join(', ')
          : q.match === 'contains' ? `contains: ${q.accept.join(' / ')}` : q.accept.join(' | '),
      };
    }),
  }));
}

export { CLUES, FILES, QUESTIONS, QUESTION_ORDER, DAYS, checkAnswer, checkPassword, shownAnswer, answerKey, norm, normPw };
