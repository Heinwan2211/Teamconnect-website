#!/usr/bin/env python3
"""Inject comprehensive SEO metadata into all Team Connect public HTML pages."""

import os
import re

WS = "/Users/HeinWandrag/.paperclip/instances/default/workspaces/9bb05ba3-8d0a-440e-8be9-9df97cfd7584"
BASE_URL = "https://www.teamconnect.co.za"
OG_DEFAULT = f"{BASE_URL}/images/og/og-default.png"

# Page metadata: slug -> (title, description, og_type, og_image, schema_type, noindex)
PAGES = {
    "index": (
        "Corporate Team Building Cape Town | Team Connect",
        "Team Connect offers premier corporate team building in Cape Town and across South Africa. The Fugitive, Amazing Race and 11 more experiences for groups of 10–500.",
        "website", OG_DEFAULT, "home", False
    ),
    "about": (
        "About Team Connect | Cape Town Team Building Experts",
        "Meet the Team Connect team — Cape Town's corporate team building specialists. Outcome-focused facilitators serving South Africa's leading companies since day one.",
        "website", OG_DEFAULT, "about", False
    ),
    "experiences": (
        "13 Team Building Experiences | Team Connect Cape Town",
        "Thirteen world-class corporate team building experiences across Cape Town and Western Cape. Outdoor, wellness, CSR, leadership, hybrid and more. Book your event.",
        "website", OG_DEFAULT, "experiences", False
    ),
    "why-us": (
        "Why Choose Team Connect | Corporate Team Building SA",
        "Discover why South African companies choose Team Connect for team building. Qualified facilitators, outcome-focused design, and experiences that deliver lasting results.",
        "website", OG_DEFAULT, "why-us", False
    ),
    "faq": (
        "Team Building FAQs | Team Connect Cape Town",
        "Answers to the most common questions about corporate team building in South Africa. Group sizes, pricing, locations, outcomes and more — Team Connect.",
        "website", OG_DEFAULT, "faq", False
    ),
    "blog": (
        "Team Building Insights & Blog | Team Connect",
        "Practical team development advice, leadership insights and team building trends from Team Connect — South Africa's leading corporate team building company.",
        "website", OG_DEFAULT, "blog", False
    ),
    "contact": (
        "Contact Team Connect | Cape Town Team Building",
        "Get in touch with Team Connect to plan your next corporate team building event in Cape Town or anywhere in South Africa. Free consultation available.",
        "website", OG_DEFAULT, "contact", False
    ),
    "facilitator-resources": (
        "Facilitator Resources | Team Connect",
        "Team Connect facilitator resources and guides.",
        "website", OG_DEFAULT, "facilitator-resources", True
    ),
    # Experience pages
    "amazing-race": (
        "Amazing Race Team Building Western Cape | Team Connect",
        "Team Connect's Amazing Race is a multi-stage adventure for corporate teams in Cape Town and Western Cape. Collaboration and problem-solving for 20 to 1000 people.",
        "website", f"{BASE_URL}/images/experiences/exp-amazing-race-hero.webp", "service", False
    ),
    "fugitive": (
        "The Fugitive — Cape Town Urban Team Building | Team Connect",
        "The Fugitive is a high-energy corporate team building experience in Cape Town's urban landscape. Strategy, trust and communication under pressure for 20 to 500 people.",
        "website", f"{BASE_URL}/images/experiences/exp-fugitive-hero.webp", "service", False
    ),
    "bespoke-experience": (
        "Bespoke Team Building Experiences | Team Connect Cape Town",
        "Fully custom corporate team building experiences designed around your team's goals, culture and context. Unique bespoke events for South African companies.",
        "website", f"{BASE_URL}/images/experiences/exp-bespoke-hero.webp", "service", False
    ),
    "community-champions": (
        "Community Champions CSI Team Building | Team Connect",
        "Community Champions is a CSI-driven corporate team building experience that gives back. Meaningful social impact activities for South African corporate teams.",
        "website", f"{BASE_URL}/images/experiences/exp-community-champions-hero.webp", "service", False
    ),
    "conference-solutions": (
        "Conference Team Building Activities | Team Connect",
        "Integrate energising team building into your conference, strategy day or year-end function. Team Connect conference solutions for South African corporate events.",
        "website", f"{BASE_URL}/images/experiences/exp-conference-hero.webp", "service", False
    ),
    "creative-collision": (
        "Creative Collision Team Building | Team Connect",
        "Creative Collision is a collaborative innovation team building experience that sparks ideas and builds creative confidence in South African corporate teams.",
        "website", f"{BASE_URL}/images/experiences/exp-creative-collision-hero.webp", "service", False
    ),
    "culture-throwdown": (
        "Culture Throwdown Team Building Game Show | Team Connect",
        "Culture Throwdown is a high-energy game show team building experience that celebrates your team's culture and values. Cape Town's most entertaining corporate event.",
        "website", f"{BASE_URL}/images/experiences/exp-culture-throwdown-hero.webp", "service", False
    ),
    "escape-labs": (
        "Escape Labs (Rouge) Team Building | Team Connect",
        "Escape Labs is an immersive puzzle and problem-solving team building experience by Team Connect. Perfect for corporate teams in Cape Town and across South Africa.",
        "website", f"{BASE_URL}/images/experiences/exp-escape-labs-hero.webp", "service", False
    ),
    "hybrid-challenge": (
        "Hybrid Team Building (Remote + In-Person) | Team Connect",
        "Hybrid Challenge bridges remote and in-person team members with a unified team building experience. South Africa's best hybrid corporate event solution.",
        "website", f"{BASE_URL}/images/experiences/exp-hybrid-challenge-hero.webp", "service", False
    ),
    "incentive-events": (
        "Corporate Incentive & Fun Events | Team Connect",
        "Celebrate team wins with Team Connect's corporate incentive and fun events. Recognition and reward experiences for South African teams of all sizes.",
        "website", f"{BASE_URL}/images/experiences/exp-incentive-fun-hero.webp", "service", False
    ),
    "leadership-development": (
        "Leadership Development Team Building | Team Connect",
        "Develop leadership skills through experiential team building. Team Connect's leadership development experiences for South African managers and executives.",
        "website", f"{BASE_URL}/images/experiences/exp-leadership-hero.webp", "service", False
    ),
    "sports-teams": (
        "Sports Team Dynamics Coaching | Team Connect",
        "Apply sports psychology principles to your corporate team. Team Connect's sports team dynamics coaching for high-performance South African corporate teams.",
        "website", f"{BASE_URL}/images/experiences/exp-sports-dynamics-hero.webp", "service", False
    ),
    "wellness": (
        "Mental & Corporate Wellness | Team Connect Cape Town",
        "Team Connect's corporate wellness experiences support mental health, resilience and wellbeing in South African workplaces. Group wellness events in Cape Town.",
        "website", f"{BASE_URL}/images/experiences/exp-wellness-hero.webp", "service", False
    ),
    # Blog posts
    "blog-post-1-psychological-safety": (
        "Why SA Teams Underperform: Psychological Safety | Team Connect",
        "Discover why psychological safety is the single biggest driver of team performance in South African workplaces — and four practical ways to build it this month.",
        "article", f"{BASE_URL}/images/blog/blog-01-psychological-safety.webp", "article", False
    ),
    "blog-post-3-coaching-leader": (
        "The Coaching Leader: Ask Better Questions | Team Connect Blog",
        "South African managers who ask better questions get better results. Learn the coaching leader framework that transforms team performance in corporate environments.",
        "article", f"{BASE_URL}/images/blog/blog-03-coaching-leader.webp", "article", False
    ),
    "blog-post-4-burnout": (
        "Team Burnout Recovery: A Corporate Guide | Team Connect Blog",
        "Recognise the signs of team burnout and learn practical recovery strategies for South African corporate teams. Expert advice from Team Connect facilitators.",
        "article", f"{BASE_URL}/images/blog/blog-04-burnout-recovery.webp", "article", False
    ),
    "blog-post-5-team-connect-stories": (
        "What Happens When a Fractured Team Meets Team Connect",
        "A real-world story of how a fractured South African corporate team transformed through a single day with Team Connect. Team building that actually works.",
        "article", f"{BASE_URL}/images/blog/blog-05-team-stories.webp", "article", False
    ),
    "blog-post-6-trends-2026": (
        "Team Building Trends 2026: What's Working in SA | Team Connect",
        "The top team building trends shaping South African corporate events in 2026. From hybrid experiences to purpose-led programmes — what HR leaders need to know.",
        "article", f"{BASE_URL}/images/blog/blog-06-trends-2026.webp", "article", False
    ),
    "blog-post-7-energise-team": (
        "5 Ways to Energise Your Team Before a Big Project | Team Connect",
        "Practical strategies to energise and align your corporate team before a major project. Proven team building techniques from Team Connect's Cape Town facilitators.",
        "article", f"{BASE_URL}/images/blog/blog-07-energise-team.webp", "article", False
    ),
    "blog-post-8-leaders-invest-teambuilding": (
        "Why Great Leaders Invest in Team Building Year-Round | Team Connect",
        "The most effective South African leaders don't treat team building as a once-a-year event. Here's why year-round investment in team culture delivers compounding returns.",
        "article", f"{BASE_URL}/images/blog/blog-08-leaders-invest.webp", "article", False
    ),
}

SERVICE_NAMES = {
    "amazing-race": "Amazing Race Team Building",
    "fugitive": "The Fugitive — Urban Team Building",
    "bespoke-experience": "Bespoke Team Building Experiences",
    "community-champions": "Community Champions CSI Experience",
    "conference-solutions": "Conference Team Building Solutions",
    "creative-collision": "Creative Collision",
    "culture-throwdown": "Culture Throwdown Game Show",
    "escape-labs": "Escape Labs (Rouge)",
    "hybrid-challenge": "Hybrid Challenge",
    "incentive-events": "Corporate Incentive Events",
    "leadership-development": "Leadership Development",
    "sports-teams": "Sports Team Dynamics Coaching",
    "wellness": "Corporate Wellness Experience",
}

BLOG_TITLES = {
    "blog-post-1-psychological-safety": "Why Most South African Teams Underperform: The Psychological Safety Gap",
    "blog-post-3-coaching-leader": "The Coaching Leader: How South African Managers Can Ask Better Questions",
    "blog-post-4-burnout": "Is Your Team Running on Empty? A Guide to Burnout Recovery",
    "blog-post-5-team-connect-stories": "What Actually Happens When a Fractured Team Spends a Day With Team Connect",
    "blog-post-6-trends-2026": "Team Building in 2026: Trends, Tools and What's Actually Working",
    "blog-post-7-energise-team": "5 Ways to Energise Your Team Before a Big Project",
    "blog-post-8-leaders-invest-teambuilding": "Why Great Leaders Invest in Team Building Year-Round",
}


def build_seo_block(slug, title, description, og_type, og_image, schema_type, noindex):
    slug_path = "/" if slug == "index" else f"/{slug}.html"
    canonical = f"{BASE_URL}{slug_path}"
    robots = "noindex, follow" if noindex else "index, follow"

    lines = [
        f'  <!-- SEO: canonical, geo, OG, Twitter -->',
        f'  <link rel="canonical" href="{canonical}" />',
        f'  <meta name="robots" content="{robots}" />',
        f'  <meta name="geo.region" content="ZA-WC" />',
        f'  <meta name="geo.placename" content="Cape Town" />',
        f'  <meta property="og:type" content="{og_type}" />',
        f'  <meta property="og:title" content="{title}" />',
        f'  <meta property="og:description" content="{description}" />',
        f'  <meta property="og:url" content="{canonical}" />',
        f'  <meta property="og:site_name" content="Team Connect" />',
        f'  <meta property="og:locale" content="en_ZA" />',
        f'  <meta property="og:image" content="{og_image}" />',
        f'  <meta property="og:image:width" content="1200" />',
        f'  <meta property="og:image:height" content="630" />',
        f'  <meta property="og:image:alt" content="Team Connect — Corporate Team Building South Africa" />',
        f'  <meta name="twitter:card" content="summary_large_image" />',
        f'  <meta name="twitter:title" content="{title}" />',
        f'  <meta name="twitter:description" content="{description}" />',
        f'  <meta name="twitter:image" content="{og_image}" />',
    ]

    # Schema.org JSON-LD
    if schema_type == "home":
        schema = '''{
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Team Connect",
    "description": "Corporate team building experiences in Cape Town and across South Africa.",
    "url": "https://www.teamconnect.co.za",
    "telephone": "+27824522283",
    "email": "Info@teamconnect.co.za",
    "image": "https://www.teamconnect.co.za/images/og/og-default.png",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Cape Town",
      "addressRegion": "Western Cape",
      "addressCountry": "ZA"
    },
    "areaServed": [
      { "@type": "City", "name": "Cape Town" },
      { "@type": "AdministrativeArea", "name": "Western Cape" },
      { "@type": "Country", "name": "South Africa" }
    ],
    "sameAs": [
      "https://www.facebook.com/theTeamConnect",
      "https://www.instagram.com/teamconnectsa",
      "https://www.tiktok.com/@teamconnectsa"
    ]
  }'''
        lines.append(f'  <script type="application/ld+json">\n  {schema}\n  </script>')

    elif schema_type == "service":
        svc_name = SERVICE_NAMES.get(slug, title.split(" | ")[0])
        schema = f'''{{\n    "@context": "https://schema.org",\n    "@type": "Service",\n    "name": "{svc_name}",\n    "description": "{description}",\n    "provider": {{\n      "@type": "LocalBusiness",\n      "name": "Team Connect",\n      "url": "https://www.teamconnect.co.za"\n    }},\n    "areaServed": [\n      {{ "@type": "City", "name": "Cape Town" }},\n      {{ "@type": "AdministrativeArea", "name": "Western Cape" }},\n      {{ "@type": "Country", "name": "South Africa" }}\n    ],\n    "serviceType": "Corporate Team Building"\n  }}'''
        lines.append(f'  <script type="application/ld+json">\n  {schema}\n  </script>')

    elif schema_type == "article":
        blog_title = BLOG_TITLES.get(slug, title.split(" | ")[0])
        schema = f'''{{\n    "@context": "https://schema.org",\n    "@type": "Article",\n    "headline": "{blog_title}",\n    "description": "{description}",\n    "image": "{og_image}",\n    "author": {{\n      "@type": "Organization",\n      "name": "Team Connect"\n    }},\n    "publisher": {{\n      "@type": "Organization",\n      "name": "Team Connect",\n      "logo": {{\n        "@type": "ImageObject",\n        "url": "https://www.teamconnect.co.za/images/Team_connect_logo_white.png"\n      }}\n    }},\n    "datePublished": "2026-04-01",\n    "dateModified": "2026-04-30"\n  }}'''
        lines.append(f'  <script type="application/ld+json">\n  {schema}\n  </script>')

    elif schema_type == "faq":
        pass  # FAQ schema added separately

    return "\n".join(lines)


FAQ_SCHEMA = """  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is team building, and why does it matter?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Team building is a structured process of helping groups work better together — improving communication, trust, collaboration, and morale. Done well, it's a measurable performance investment. We focus on outcomes, not just activities."
        }
      },
      {
        "@type": "Question",
        "name": "What kind of companies do you work with?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "We work with corporate teams of all sizes across industries — from startups to JSE-listed companies. Our clients include HR teams, C-suite leaders, department heads, and event coordinators."
        }
      },
      {
        "@type": "Question",
        "name": "How do I know what experience is right for my team?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Start with a free consultation. Tell us about your team, what's going on, and what you want to walk away with. We'll recommend the right format, duration, and activities based on your specific context."
        }
      },
      {
        "@type": "Question",
        "name": "How far in advance should I book?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "For smaller groups under 30, two to three weeks is usually sufficient. For 30–100 people, allow four to six weeks. For large events of 100+, book two to three months in advance."
        }
      },
      {
        "@type": "Question",
        "name": "What group sizes do you cater for?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "We cater for groups from 10 to 500+. Our experiences are designed to scale without losing quality."
        }
      },
      {
        "@type": "Question",
        "name": "Do you come to us, or do we come to you?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Both. We can facilitate at your office, at a venue of your choice, or at one of our recommended partner venues. We're fully mobile and operate nationally."
        }
      },
      {
        "@type": "Question",
        "name": "Which cities do you operate in?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "We operate across South Africa with primary presence in Cape Town, Johannesburg, Pretoria, and Durban. For other locations, we travel — just ask."
        }
      },
      {
        "@type": "Question",
        "name": "How long does a session typically last?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Our formats range from two-hour energisers to full-day programmes. The most popular format is a half-day experience of three to four hours."
        }
      },
      {
        "@type": "Question",
        "name": "Can we combine team building with a conference or function?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes — and this is one of the most popular formats. We integrate seamlessly into conferences, year-end functions, leadership summits, and strategy days."
        }
      },
      {
        "@type": "Question",
        "name": "How much does team building cost?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Pricing is based on group size, duration, activity type, and location. We offer transparent, itemised quotes with no hidden costs. Contact us for a free, no-obligation quote."
        }
      },
      {
        "@type": "Question",
        "name": "Can the experience be customised for our team?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Absolutely. We tailor every experience to your team's goals, culture, size, and context. We can incorporate company values, current business challenges, branding, and more."
        }
      }
    ]
  }
  </script>"""


def process_file(slug, filename):
    filepath = os.path.join(WS, filename)
    if not os.path.exists(filepath):
        print(f"  SKIP (not found): {filename}")
        return

    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Check if already processed
    if 'og:title' in content:
        print(f"  SKIP (already has OG tags): {filename}")
        return

    title, description, og_type, og_image, schema_type, noindex = PAGES[slug]

    # Update lang attribute
    content = content.replace('<html lang="en">', '<html lang="en-ZA">', 1)

    # Update title if it doesn't match our spec
    # (titles already exist in most files, so just update)
    content = re.sub(r'<title>[^<]*</title>', f'<title>{title}</title>', content, count=1)

    # Update meta description
    content = re.sub(
        r'<meta name="description" content="[^"]*" />',
        f'<meta name="description" content="{description}" />',
        content, count=1
    )

    # Build SEO block
    seo_block = build_seo_block(slug, title, description, og_type, og_image, schema_type, noindex)

    # For FAQ page, append FAQ schema
    if slug == "faq":
        seo_block += "\n" + FAQ_SCHEMA

    # Insert before </head>
    content = content.replace("</head>", seo_block + "\n</head>", 1)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"  OK: {filename}")


def create_sitemap():
    urls = [
        ("", "1.0", "weekly"),
        ("about.html", "0.7", "monthly"),
        ("experiences.html", "0.9", "weekly"),
        ("why-us.html", "0.7", "monthly"),
        ("faq.html", "0.7", "monthly"),
        ("blog.html", "0.7", "weekly"),
        ("contact.html", "0.7", "monthly"),
        ("amazing-race.html", "0.8", "monthly"),
        ("fugitive.html", "0.8", "monthly"),
        ("bespoke-experience.html", "0.8", "monthly"),
        ("community-champions.html", "0.8", "monthly"),
        ("conference-solutions.html", "0.8", "monthly"),
        ("creative-collision.html", "0.8", "monthly"),
        ("culture-throwdown.html", "0.8", "monthly"),
        ("escape-labs.html", "0.8", "monthly"),
        ("hybrid-challenge.html", "0.8", "monthly"),
        ("incentive-events.html", "0.8", "monthly"),
        ("leadership-development.html", "0.8", "monthly"),
        ("sports-teams.html", "0.8", "monthly"),
        ("wellness.html", "0.8", "monthly"),
        ("blog-post-1-psychological-safety.html", "0.6", "monthly"),
        ("blog-post-3-coaching-leader.html", "0.6", "monthly"),
        ("blog-post-4-burnout.html", "0.6", "monthly"),
        ("blog-post-5-team-connect-stories.html", "0.6", "monthly"),
        ("blog-post-6-trends-2026.html", "0.6", "monthly"),
        ("blog-post-7-energise-team.html", "0.6", "monthly"),
        ("blog-post-8-leaders-invest-teambuilding.html", "0.6", "monthly"),
    ]

    xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    for path, priority, freq in urls:
        loc = f"{BASE_URL}/{path}"
        xml += f"  <url>\n"
        xml += f"    <loc>{loc}</loc>\n"
        xml += f"    <lastmod>2026-04-30</lastmod>\n"
        xml += f"    <changefreq>{freq}</changefreq>\n"
        xml += f"    <priority>{priority}</priority>\n"
        xml += f"  </url>\n"
    xml += '</urlset>\n'

    with open(os.path.join(WS, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write(xml)
    print("  OK: sitemap.xml")


def create_robots():
    txt = """User-agent: *
Allow: /

# Internal facilitator resources — not for indexing
Disallow: /facilitator-resources.html
Disallow: /checklist-
Disallow: /client-pack-
Disallow: /facilitator-guide-
Disallow: /blog-post-template.html

Sitemap: https://www.teamconnect.co.za/sitemap.xml
"""
    with open(os.path.join(WS, "robots.txt"), "w", encoding="utf-8") as f:
        f.write(txt)
    print("  OK: robots.txt")


def create_og_image_placeholder():
    og_dir = os.path.join(WS, "images", "og")
    os.makedirs(og_dir, exist_ok=True)
    placeholder = os.path.join(og_dir, "og-default.png")
    if not os.path.exists(placeholder):
        # Create a symlink to existing logo as fallback
        logo = os.path.join(WS, "images", "Team_connect_logo_white.png")
        if os.path.exists(logo):
            import shutil
            shutil.copy2(logo, placeholder)
            print("  OK: images/og/og-default.png (fallback copy of logo)")
        else:
            print("  WARN: Could not create og-default.png — source logo not found")
    else:
        print("  OK: images/og/og-default.png (already exists)")


if __name__ == "__main__":
    print("\n=== SEO Injection Script ===\n")

    print("Processing HTML files...")
    for slug, data in PAGES.items():
        filename = "index.html" if slug == "index" else f"{slug}.html"
        process_file(slug, filename)

    print("\nCreating sitemap.xml...")
    create_sitemap()

    print("\nCreating robots.txt...")
    create_robots()

    print("\nCreating OG image placeholder...")
    create_og_image_placeholder()

    print("\n=== Done ===\n")
