#!/usr/bin/env node
/**
 * Lighthouse fix script:
 * 1. Add favicon link to all public pages
 * 2. Add hero/featured image preload to pages with hero-bg/featured-image
 * 3. Fix mobile.css render-blocking (media="print" trick)
 * 4. Fix "Learn More" links lacking aria-label in index.html
 * 5. Fix facilitator-resources.html noindex meta
 */
const fs = require('fs');
const path = require('path');

const DIR = __dirname;

// Pages to fix (skip internal pages)
const PUBLIC_PAGES = [
  'index.html', 'about.html', 'experiences.html', 'why-us.html', 'faq.html',
  'blog.html', 'contact.html', 'facilitator-resources.html',
  'amazing-race.html', 'bespoke-experience.html', 'community-champions.html',
  'conference-solutions.html', 'creative-collision.html', 'culture-throwdown.html',
  'escape-labs.html', 'fugitive.html', 'hybrid-challenge.html', 'incentive-events.html',
  'leadership-development.html', 'sports-teams.html', 'wellness.html',
  'blog-post-1-psychological-safety.html', 'blog-post-3-coaching-leader.html',
  'blog-post-4-burnout.html', 'blog-post-5-team-connect-stories.html',
  'blog-post-6-trends-2026.html', 'blog-post-7-energise-team.html',
  'blog-post-8-leaders-invest-teambuilding.html',
];

function fixPage(filename) {
  const filepath = path.join(DIR, filename);
  let html = fs.readFileSync(filepath, 'utf8');
  let changed = false;

  // 1. Add favicon link if not present
  if (!html.includes('rel="icon"') && !html.includes("rel='icon'")) {
    html = html.replace(
      /<meta charset="UTF-8"/,
      `<meta charset="UTF-8" />\n  <link rel="icon" href="/favicon.png" type="image/png" />`
    );
    // If the replacement didn't work, try another anchor
    if (!html.includes('favicon.png')) {
      html = html.replace(
        /<\/head>/,
        `  <link rel="icon" href="/favicon.png" type="image/png" />\n</head>`
      );
    }
    if (html.includes('favicon.png')) {
      console.log(`  [favicon] ${filename}`);
      changed = true;
    }
  }

  // 2. Add hero image preload (for pages with hero-bg images)
  const heroMatch = html.match(/<img[^>]+src="([^"]+)"[^>]+class="hero-bg"/) ||
                    html.match(/<img[^>]+class="hero-bg"[^>]+src="([^"]+)"/);
  if (heroMatch && !html.includes(`rel="preload" as="image" href="${heroMatch[1]}"`)) {
    const heroSrc = heroMatch[1];
    // Add preload after the logo preload or at top of head preloads
    const preloadTag = `\n  <link rel="preload" as="image" href="${heroSrc}" fetchpriority="high" />`;
    // Insert after last existing preload or before preconnect
    if (html.includes('rel="preload"')) {
      // Insert after last preload
      const lastPreload = html.lastIndexOf('rel="preload"');
      const afterPreload = html.indexOf('>', lastPreload) + 1;
      html = html.slice(0, afterPreload) + preloadTag + html.slice(afterPreload);
    } else {
      html = html.replace('<link rel="preconnect"', `${preloadTag}\n  <link rel="preconnect"`);
    }
    console.log(`  [hero-preload] ${filename}: ${heroSrc}`);
    changed = true;
  }

  // 3. Add featured image preload for blog posts
  const featuredMatch = html.match(/<img[^>]+class="featured-image__img"|<div class="featured-image"[^>]*>\s*<img[^>]+src="([^"]+)"/);
  const featuredImgMatch = html.match(/class="featured-image"[^\n]*\n\s*<img[^>]+src="([^"]+)"/);
  if (featuredImgMatch && !html.includes(`rel="preload" as="image" href="${featuredImgMatch[1]}"`)) {
    const featSrc = featuredImgMatch[1];
    const preloadTag = `\n  <link rel="preload" as="image" href="${featSrc}" fetchpriority="high" />`;
    if (html.includes('rel="preload"')) {
      const lastPreload = html.lastIndexOf('rel="preload"');
      const afterPreload = html.indexOf('>', lastPreload) + 1;
      html = html.slice(0, afterPreload) + preloadTag + html.slice(afterPreload);
    } else {
      html = html.replace('<link rel="preconnect"', `${preloadTag}\n  <link rel="preconnect"`);
    }
    console.log(`  [featured-preload] ${filename}: ${featSrc}`);
    changed = true;
  }

  // 4. Fix mobile.css render-blocking
  if (html.includes('<link rel="stylesheet" href="mobile.css">')) {
    html = html.replace(
      '<link rel="stylesheet" href="mobile.css">',
      '<link rel="stylesheet" href="mobile.css" media="print" onload="this.media=\'all\'">\n  <noscript><link rel="stylesheet" href="mobile.css"></noscript>'
    );
    console.log(`  [mobile-css-async] ${filename}`);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filepath, html, 'utf8');
  }
  return changed;
}

// Fix all pages
let totalChanged = 0;
for (const page of PUBLIC_PAGES) {
  const filepath = path.join(DIR, page);
  if (!fs.existsSync(filepath)) {
    console.log(`SKIP (not found): ${page}`);
    continue;
  }
  const changed = fixPage(page);
  if (changed) totalChanged++;
}

console.log(`\nFixed ${totalChanged} pages.`);
