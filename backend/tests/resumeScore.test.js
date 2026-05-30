const { scoreResume } = require('../src/services/resumeScore.service');

describe('Resume Score Service', () => {
  test('returns 0 for empty text', () => {
    const result = scoreResume('');
    expect(result.score).toBe(0);
  });

  test('detects sections correctly', () => {
    const text = `
      Education: B.Tech CSE from ABC University 2025
      Skills: JavaScript, React, Node.js, MongoDB
      Projects: Built a placement management system
      Experience: Internship at XYZ Corp
      Achievements: Won hackathon 2024
      Contact: john@email.com | linkedin.com/in/john | github.com/john
      Summary: Passionate developer seeking opportunities
    `;
    const result = scoreResume(text);
    expect(result.breakdown.sections.score).toBeGreaterThan(20);
    expect(result.breakdown.sections.detail.education).toBe(true);
    expect(result.breakdown.sections.detail.skills).toBe(true);
    expect(result.breakdown.sections.detail.projects).toBe(true);
  });

  test('scores keywords correctly', () => {
    const text = `
      Skills: JavaScript React Node.js MongoDB Python Docker AWS Git
      Experience: worked with REST API GraphQL TypeScript
    `;
    const result = scoreResume(text);
    expect(result.breakdown.keywords.score).toBeGreaterThan(10);
    expect(result.breakdown.keywords.found).toContain('javascript');
    expect(result.breakdown.keywords.found).toContain('react');
  });

  test('penalizes very short resume', () => {
    const result = scoreResume('John Doe. Skills: JavaScript.');
    expect(result.breakdown.length.score).toBeLessThan(20);
    expect(result.suggestions.some((s) => s.includes('too short'))).toBe(true);
  });

  test('detects contact info', () => {
    const text = 'Email: john@test.com Phone: 9876543210 linkedin github';
    const result = scoreResume(text);
    expect(result.breakdown.contact.detail.hasEmail).toBe(true);
    expect(result.breakdown.contact.detail.hasPhone).toBe(true);
    expect(result.breakdown.contact.detail.hasLinkedin).toBe(true);
    expect(result.breakdown.contact.detail.hasGithub).toBe(true);
    expect(result.breakdown.contact.score).toBe(10);
  });

  test('gives grade A for strong resume', () => {
    const text = `
      Summary: Experienced software engineer with 2 years of internship experience.
      Education: B.Tech Computer Science Engineering from ABC University 2025 CGPA 9.0
      Experience: Internship at Google. Worked with JavaScript React Node.js MongoDB Docker AWS.
      Skills: JavaScript TypeScript React Node.js Express MongoDB SQL PostgreSQL Docker Git GitHub AWS Python
      Projects: Built REST API system. Used GraphQL TypeScript Next.js Redux Tailwind.
      Achievements: Won national hackathon. AWS Certified. Certifications in machine learning deep learning.
      Contact: john@email.com | 9876543210 | linkedin.com/in/john | github.com/john | portfolio.dev
      System design agile scrum ci/cd linux data structures algorithms
    `;
    const result = scoreResume(text);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.grade).toBe('A');
  });

  test('gives suggestions for missing sections', () => {
    const result = scoreResume('John Doe software developer javascript react');
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});