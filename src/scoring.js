/**
 * DISC Personality Profile — question data and scoring.
 * Transcribed exactly from Team Connect's two source PDFs.
 * 24 boxes, 4 phrases each. Each phrase carries a "Most" code and a
 * "Least" code: 1=D, 2=I, 3=S, 4=C, 5=not scored.
 *
 * Scoring follows the paper instructions: tally how many times each code
 * is chosen in the Most column (Graph 1) and the Least column (Graph 2).
 */

export const BOXES = [
  [ {t:"Trusting, Enthusiastic",m:2,l:2}, {t:"Tolerant, Respectful",m:4,l:4}, {t:"Courageous, Adventurous",m:5,l:1}, {t:"Agreeable, Accommodating",m:3,l:3} ],
  [ {t:"Affectionate, Tender",m:2,l:5}, {t:"Simple, Compliant",m:5,l:4}, {t:"Determined, Wants results",m:1,l:1}, {t:"Content, Gratified",m:3,l:5} ],
  [ {t:"Innovative, Visionary",m:1,l:1}, {t:"Reserved, Reticent",m:4,l:5}, {t:"Sociable, Congenial",m:5,l:2}, {t:"Peacemaker, Negotiator",m:3,l:3} ],
  [ {t:"Unafraid, Independent",m:1,l:1}, {t:"Reserved, Cautious restraint",m:4,l:4}, {t:"Carefree, Lacks caution",m:2,l:2}, {t:"Kind, Cordial",m:3,l:5} ],
  [ {t:"Precise, Accurate",m:5,l:4}, {t:"Focused, Goal-oriented",m:1,l:5}, {t:"Team player, Accommodating",m:5,l:3}, {t:"Encourage others, Stimulating",m:2,l:2} ],
  [ {t:"Conscientious, Plans for future",m:4,l:5}, {t:"Recognition, Seeks advancement",m:1,l:1}, {t:"Venturesome, Audacious",m:2,l:2}, {t:"Dependable, Good listener",m:3,l:3} ],
  [ {t:"Sensitive, Becomes frustrated",m:4,l:4}, {t:"Stand up to opposition, right",m:1,l:1}, {t:"Complacent, keeps feelings inside",m:3,l:3}, {t:"Tell my side of the story, want to be heard",m:5,l:2} ],
  [ {t:"Rules make it boring, Restless",m:2,l:2}, {t:"Challenges the rules, Daring",m:5,l:1}, {t:"Rules make it safe, Security",m:3,l:3}, {t:"Rules make it fair, Justice",m:4,l:5} ],
  [ {t:"Seeks balance, Calm",m:3,l:3}, {t:"Talkative, Charismatic",m:2,l:5}, {t:"Orderly, Follows the rules",m:5,l:4}, {t:"Fast paced, High spirited",m:1,l:1} ],
  [ {t:"Likes awards, Accomplishments",m:1,l:1}, {t:"Enjoys social, Group gatherings",m:2,l:5}, {t:"Continues education, Cultured",m:5,l:4}, {t:"Wants to be safe, Unthreatened",m:3,l:3} ],
  [ {t:"Systematic, Time management",m:4,l:5}, {t:"Anxious, Hurried",m:1,l:1}, {t:"Dependable, Persistent",m:3,l:3}, {t:"Emotional, Impulsive",m:2,l:2} ],
  [ {t:"Cautious, Calculating",m:4,l:5}, {t:"Consistent, Thorough",m:5,l:3}, {t:"Outgoing, Enthusiastic",m:5,l:2}, {t:"Take charge, Direct approach",m:1,l:1} ],
  [ {t:"Detached, Too careful",m:5,l:4}, {t:"Unrealistic, Overcommitted",m:2,l:2}, {t:"Complacent, Resist change",m:3,l:5}, {t:"Blunt, Overbearing",m:5,l:1} ],
  [ {t:"Excitable, Cheerful",m:2,l:2}, {t:"Supporter, Advocate",m:3,l:5}, {t:"Methodical, Exact",m:5,l:4}, {t:"Competitive, Argumentative",m:1,l:1} ],
  [ {t:"A good analyzer",m:4,l:4}, {t:"A good listener",m:3,l:3}, {t:"A good encourager",m:2,l:2}, {t:"A good delegator",m:1,l:1} ],
  [ {t:"I will get the facts",m:4,l:5}, {t:"I will follow through",m:3,l:3}, {t:"I will lead them",m:1,l:5}, {t:"I will persuade them",m:2,l:2} ],
  [ {t:"Forceful, Driven",m:1,l:1}, {t:"Optimistic, Charismatic",m:5,l:2}, {t:"Cooperative, Let's do it together",m:5,l:3}, {t:"Accuracy counts, Precise",m:4,l:4} ],
  [ {t:"Loyal, Reflective",m:3,l:3}, {t:"Likes a challenge, Pioneering",m:1,l:1}, {t:"Analytical, Tactful",m:5,l:4}, {t:"Popular, Persuasive",m:2,l:2} ],
  [ {t:"Will wait to buy, Patient",m:3,l:3}, {t:"Will buy on impulse, Decisive",m:1,l:1}, {t:"Will spend on what I want, selfish",m:2,l:5}, {t:"Will do without, Self-controlled",m:5,l:4} ],
  [ {t:"Agreeable, Approachable",m:3,l:3}, {t:"Animated, Exuberant",m:5,l:2}, {t:"Dauntless, Bold",m:1,l:1}, {t:"Orderly, Adaptive",m:4,l:4} ],
  [ {t:"Rigid, Wants things exact",m:4,l:4}, {t:"Avoids monotony, Bored by routine",m:5,l:2}, {t:"Seeks change, Goes for it",m:1,l:1}, {t:"Congenial, Acts of kindness",m:3,l:5} ],
  [ {t:"Authoritative, Influencer",m:5,l:1}, {t:"Enjoys attention, New opportunities",m:2,l:5}, {t:"Avoids conflict, Relaxed",m:3,l:3}, {t:"Goes by the book, Diplomatic",m:5,l:4} ],
  [ {t:"Impulsive, Emotional",m:2,l:2}, {t:"Calculating, Overload w/details",m:4,l:5}, {t:"Demanding, Domineering",m:1,l:1}, {t:"Non-confrontational, Predictable",m:5,l:3} ],
  [ {t:"Creative, Unique",m:2,l:2}, {t:"Bottom line organizer, Results oriented",m:1,l:5}, {t:"Trustworthy, Authentic",m:5,l:3}, {t:"High standards, Looks to benchmarks",m:4,l:5} ]
];

/**
 * Score a set of answers.
 * @param {Array<{most:number, least:number}>} answers - one entry per box,
 *   each giving the 0-based index of the chosen Most and Least phrase.
 * @returns {{M:{D,I,S,C,X}, L:{D,I,S,C,X}}} tallies by trait.
 */
export function score(answers) {
  const M = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const L = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  BOXES.forEach((box, i) => {
    const a = answers[i];
    if (!a) return;
    const mp = box[a.most];
    const lp = box[a.least];
    if (mp) M[mp.m]++;
    if (lp) L[lp.l]++;
  });
  return {
    M: { D: M[1], I: M[2], S: M[3], C: M[4], X: M[5] },
    L: { D: L[1], I: L[2], S: L[3], C: L[4], X: L[5] }
  };
}
