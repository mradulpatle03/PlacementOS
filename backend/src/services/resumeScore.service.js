const SECTION_KEYWORDS = {
  education:    ['education', 'qualification', 'degree', 'university', 'college', 'school', 'b.tech', 'b.e', 'btech'],
  experience:   ['experience', 'internship', 'work experience', 'employment', 'worked at', 'job'],
  skills:       ['skills', 'technical skills', 'technologies', 'tools', 'languages', 'frameworks'],
  projects:     ['projects', 'personal projects', 'academic projects', 'project work'],
  achievements: ['achievements', 'awards', 'honors', 'accomplishments', 'certifications', 'certificates'],
  contact:      ['email', 'phone', 'linkedin', 'github', 'portfolio', 'contact'],
  summary:      ['summary', 'objective', 'profile', 'about me', 'career objective'],
};

const STRONG_KEYWORDS = [
  'javascript', 'python', 'java', 'c++', 'react', 'node', 'express', 'mongodb',
  'sql', 'mysql', 'postgresql', 'docker', 'kubernetes', 'aws', 'git', 'github',
  'machine learning', 'deep learning', 'data structures', 'algorithms',
  'rest api', 'graphql', 'typescript', 'next.js', 'tailwind', 'redux',
  'linux', 'agile', 'scrum', 'ci/cd', 'system design',
];

const WORD_COUNT_IDEAL_MIN = 300;
const WORD_COUNT_IDEAL_MAX = 800;

const scoreResume = (text) => {
  if (!text || text.trim().length === 0) {
    return { score: 0, breakdown: {}, suggestions: ['Could not extract text from PDF'] };
  }

  const lower = text.toLowerCase();
  const words = lower.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const breakdown = {};
  const suggestions = [];

  // 1. Section presence (40 points, ~5-6 pts each)
  let sectionScore = 0;
  const sectionResults = {};

  for (const [section, keywords] of Object.entries(SECTION_KEYWORDS)) {
    const found = keywords.some((kw) => lower.includes(kw));
    sectionResults[section] = found;
    if (found) {
      sectionScore += 5;
    } else {
      suggestions.push(`Add a ${section} section`);
    }
  }

  // cap at 40
  sectionScore = Math.min(sectionScore, 40);
  breakdown.sections = { score: sectionScore, max: 40, detail: sectionResults };

  // 2. Length score (20 points)
  let lengthScore = 0;
  if (wordCount >= WORD_COUNT_IDEAL_MIN && wordCount <= WORD_COUNT_IDEAL_MAX) {
    lengthScore = 20;
  } else if (wordCount < WORD_COUNT_IDEAL_MIN) {
    lengthScore = Math.floor((wordCount / WORD_COUNT_IDEAL_MIN) * 20);
    suggestions.push(`Resume is too short (${wordCount} words). Aim for ${WORD_COUNT_IDEAL_MIN}–${WORD_COUNT_IDEAL_MAX} words.`);
  } else {
    // too long — penalize slightly
    lengthScore = Math.max(10, 20 - Math.floor((wordCount - WORD_COUNT_IDEAL_MAX) / 100));
    suggestions.push(`Resume may be too long (${wordCount} words). Consider trimming.`);
  }
  breakdown.length = { score: lengthScore, max: 20, wordCount };

  // 3. Keyword density (30 points) 
  const foundKeywords = STRONG_KEYWORDS.filter((kw) => lower.includes(kw));
  const keywordScore = Math.min(30, foundKeywords.length * 2);

  if (foundKeywords.length < 5) {
    suggestions.push('Add more technical keywords relevant to your target role');
  }
  breakdown.keywords = {
    score: keywordScore,
    max: 30,
    found: foundKeywords,
    count: foundKeywords.length,
  };

  // 4. Contact info completeness (10 points) 
  let contactScore = 0;
  const hasEmail   = /[\w.-]+@[\w.-]+\.\w+/.test(lower);
  const hasPhone   = /[\d\s\-\+\(\)]{10,}/.test(text);
  const hasLinkedin = lower.includes('linkedin');
  const hasGithub  = lower.includes('github');

  if (hasEmail)    contactScore += 3;
  if (hasPhone)    contactScore += 3;
  if (hasLinkedin) contactScore += 2;
  if (hasGithub)   contactScore += 2;

  if (!hasEmail)    suggestions.push('Add your email address');
  if (!hasPhone)    suggestions.push('Add your phone number');
  if (!hasLinkedin) suggestions.push('Add your LinkedIn profile URL');
  if (!hasGithub)   suggestions.push('Add your GitHub profile URL');

  breakdown.contact = {
    score: contactScore,
    max: 10,
    detail: { hasEmail, hasPhone, hasLinkedin, hasGithub },
  };

  // Total 
  const total = sectionScore + lengthScore + keywordScore + contactScore;

  return {
    score: total,
    grade: total >= 80 ? 'A' : total >= 60 ? 'B' : total >= 40 ? 'C' : 'D',
    breakdown,
    suggestions,
  };
};

module.exports = { scoreResume };