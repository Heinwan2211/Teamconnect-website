#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://teamconnect-website.heinwan.workers.dev';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const PAGES = [
  'index.html',
  'about.html',
  'experiences.html',
  'why-us.html',
  'faq.html',
  'blog.html',
  'contact.html',
  'facilitator-resources.html',
  'amazing-race.html',
  'bespoke-experience.html',
  'community-champions.html',
  'conference-solutions.html',
  'creative-collision.html',
  'culture-throwdown.html',
  'escape-labs.html',
  'fugitive.html',
  'hybrid-challenge.html',
  'incentive-events.html',
  'leadership-development.html',
  'sports-teams.html',
  'wellness.html',
  'blog-post-1-psychological-safety.html',
  'blog-post-3-coaching-leader.html',
  'blog-post-4-burnout.html',
  'blog-post-5-team-connect-stories.html',
  'blog-post-6-trends-2026.html',
  'blog-post-7-energise-team.html',
  'blog-post-8-leaders-invest-teambuilding.html',
];

const results = [];
const outputDir = '/tmp/lighthouse-results';
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

for (const page of PAGES) {
  const url = page === 'index.html' ? BASE_URL : `${BASE_URL}/${page}`;
  const safeName = page.replace('.html', '');
  const outputPath = path.join(outputDir, `${safeName}.json`);

  console.log(`\nAuditing: ${url}`);

  try {
    execSync(
      `npx lighthouse "${url}" \
        --chrome-flags="--headless --no-sandbox --disable-gpu" \
        --output=json \
        --output-path="${outputPath}" \
        --only-categories=performance,accessibility,best-practices,seo \
        --quiet`,
      {
        env: { ...process.env, CHROME_PATH },
        timeout: 120000,
        stdio: ['ignore', 'ignore', 'ignore']
      }
    );

    const report = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    const cats = report.categories;
    const score = {
      page,
      url,
      performance: Math.round(cats.performance.score * 100),
      accessibility: Math.round(cats.accessibility.score * 100),
      bestPractices: Math.round(cats['best-practices'].score * 100),
      seo: Math.round(cats.seo.score * 100),
    };

    // Collect top opportunities for low-scoring pages
    const audits = report.audits;
    const opportunities = [];

    if (score.performance < 90) {
      // Get performance opportunities sorted by savings
      const perfOps = Object.values(audits)
        .filter(a => a.details && a.details.type === 'opportunity' && a.score !== null && a.score < 1)
        .sort((a, b) => (b.details.overallSavingsMs || 0) - (a.details.overallSavingsMs || 0))
        .slice(0, 5)
        .map(a => `${a.title} (${a.details.overallSavingsMs ? Math.round(a.details.overallSavingsMs) + 'ms' : 'N/A'})`);
      opportunities.push(...perfOps.map(o => `PERF: ${o}`));
    }

    if (score.accessibility < 95) {
      const a11yFails = Object.values(audits)
        .filter(a => a.score !== null && a.score < 1 && a.details && (a.details.type === 'table' || a.details.type === 'node') && a.id.startsWith && !a.id.startsWith('uses-'))
        .slice(0, 3)
        .map(a => a.title);
      opportunities.push(...a11yFails.map(o => `A11Y: ${o}`));
    }

    if (score.bestPractices < 95) {
      const bpFails = Object.values(audits)
        .filter(a => a.score !== null && a.score < 1 && ['uses-https','no-unload-listeners','csp-xss','deprecations','errors-in-console'].includes(a.id))
        .slice(0, 3)
        .map(a => a.title);
      opportunities.push(...bpFails.map(o => `BP: ${o}`));
    }

    if (score.seo < 95) {
      const seoFails = Object.values(audits)
        .filter(a => a.score !== null && a.score < 1 && ['meta-description','document-title','link-text','robots-txt','hreflang','canonical'].includes(a.id))
        .slice(0, 3)
        .map(a => a.title);
      opportunities.push(...seoFails.map(o => `SEO: ${o}`));
    }

    score.opportunities = opportunities;
    results.push(score);
    console.log(`  ✓ Perf:${score.performance} A11y:${score.accessibility} BP:${score.bestPractices} SEO:${score.seo}`);

  } catch (e) {
    console.error(`  ✗ Failed: ${e.message.substring(0, 100)}`);
    results.push({ page, url, performance: 0, accessibility: 0, bestPractices: 0, seo: 0, error: e.message.substring(0, 200), opportunities: [] });
  }
}

// Sort by performance ascending
results.sort((a, b) => a.performance - b.performance);

// Write summary
const summary = {
  auditDate: new Date().toISOString(),
  results,
  averages: {
    performance: Math.round(results.reduce((s, r) => s + r.performance, 0) / results.length),
    accessibility: Math.round(results.reduce((s, r) => s + r.accessibility, 0) / results.length),
    bestPractices: Math.round(results.reduce((s, r) => s + r.bestPractices, 0) / results.length),
    seo: Math.round(results.reduce((s, r) => s + r.seo, 0) / results.length),
  }
};

fs.writeFileSync('/tmp/lighthouse-summary.json', JSON.stringify(summary, null, 2));

console.log('\n\n=== AUDIT SUMMARY ===');
console.log('\nPage                                          | Perf | A11y | BP   | SEO');
console.log('----------------------------------------------|------|------|------|-----');
results.forEach(r => {
  const pageName = r.page.padEnd(45).substring(0, 45);
  console.log(`${pageName} | ${String(r.performance).padStart(4)} | ${String(r.accessibility).padStart(4)} | ${String(r.bestPractices).padStart(4)} | ${String(r.seo).padStart(3)}`);
});
console.log('\nAverages:');
console.log(`  Performance: ${summary.averages.performance}`);
console.log(`  Accessibility: ${summary.averages.accessibility}`);
console.log(`  Best Practices: ${summary.averages.bestPractices}`);
console.log(`  SEO: ${summary.averages.seo}`);

console.log('\n\n=== OPPORTUNITIES BY PAGE ===');
results.forEach(r => {
  if (r.opportunities && r.opportunities.length > 0) {
    console.log(`\n${r.page}:`);
    r.opportunities.forEach(o => console.log(`  - ${o}`));
  }
});

console.log('\nSummary saved to /tmp/lighthouse-summary.json');
