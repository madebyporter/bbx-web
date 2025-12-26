#!/usr/bin/env node

/**
 * SEO Diagnosis Script
 * Fetches raw HTML and analyzes meta tags to diagnose SSR SEO issues
 * 
 * Usage:
 *   node scripts/diagnose-seo.js https://beatbox.studio/u/madebyporter
 *   node scripts/diagnose-seo.js https://beatbox.studio/u/another-username
 */

import https from 'https'
import http from 'http'
import fs from 'fs'
import path from 'path'

function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const client = urlObj.protocol === 'https:' ? https : http
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SEOBot/1.0; +https://beatbox.studio)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    }
    
    const req = client.request(options, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        resolve(data)
      })
    })
    
    req.on('error', (error) => {
      reject(error)
    })
    
    req.end()
  })
}

function extractHead(html) {
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)
  return headMatch ? headMatch[1] : ''
}

function analyzeMetaTags(head) {
  const analysis = {
    title: [],
    description: [],
    ogTitle: [],
    ogDescription: [],
    ogImage: [],
    ogUrl: [],
    ogType: [],
    twitterTitle: [],
    twitterDescription: [],
    twitterImage: [],
    twitterCard: [],
    canonical: []
  }
  
  // Extract <title>
  const titleMatches = head.matchAll(/<title[^>]*>([^<]*)<\/title>/gi)
  for (const match of titleMatches) {
    analysis.title.push(match[1].trim())
  }
  
  // Extract meta tags
  const metaMatches = head.matchAll(/<meta[^>]*>/gi)
  for (const match of metaMatches) {
    const meta = match[0]
    
    // name="description"
    const descMatch = meta.match(/name=["']description["'][^>]*content=["']([^"']*)["']/i)
    if (descMatch) {
      analysis.description.push(descMatch[1])
    }
    
    // property="og:title"
    const ogTitleMatch = meta.match(/property=["']og:title["'][^>]*content=["']([^"']*)["']/i)
    if (ogTitleMatch) {
      analysis.ogTitle.push(ogTitleMatch[1])
    }
    
    // property="og:description"
    const ogDescMatch = meta.match(/property=["']og:description["'][^>]*content=["']([^"']*)["']/i)
    if (ogDescMatch) {
      analysis.ogDescription.push(ogDescMatch[1])
    }
    
    // property="og:image"
    const ogImageMatch = meta.match(/property=["']og:image["'][^>]*content=["']([^"']*)["']/i)
    if (ogImageMatch) {
      analysis.ogImage.push(ogImageMatch[1])
    }
    
    // property="og:url"
    const ogUrlMatch = meta.match(/property=["']og:url["'][^>]*content=["']([^"']*)["']/i)
    if (ogUrlMatch) {
      analysis.ogUrl.push(ogUrlMatch[1])
    }
    
    // property="og:type"
    const ogTypeMatch = meta.match(/property=["']og:type["'][^>]*content=["']([^"']*)["']/i)
    if (ogTypeMatch) {
      analysis.ogType.push(ogTypeMatch[1])
    }
    
    // name="twitter:title"
    const twTitleMatch = meta.match(/name=["']twitter:title["'][^>]*content=["']([^"']*)["']/i)
    if (twTitleMatch) {
      analysis.twitterTitle.push(twTitleMatch[1])
    }
    
    // name="twitter:description"
    const twDescMatch = meta.match(/name=["']twitter:description["'][^>]*content=["']([^"']*)["']/i)
    if (twDescMatch) {
      analysis.twitterDescription.push(twDescMatch[1])
    }
    
    // name="twitter:image"
    const twImageMatch = meta.match(/name=["']twitter:image["'][^>]*content=["']([^"']*)["']/i)
    if (twImageMatch) {
      analysis.twitterImage.push(twImageMatch[1])
    }
    
    // name="twitter:card"
    const twCardMatch = meta.match(/name=["']twitter:card["'][^>]*content=["']([^"']*)["']/i)
    if (twCardMatch) {
      analysis.twitterCard.push(twCardMatch[1])
    }
  }
  
  // Extract canonical links
  const canonicalMatches = head.matchAll(/<link[^>]*rel=["']canonical["'][^>]*>/gi)
  for (const match of canonicalMatches) {
    const hrefMatch = match[0].match(/href=["']([^"']*)["']/i)
    if (hrefMatch) {
      analysis.canonical.push(hrefMatch[1])
    }
  }
  
  return analysis
}

function generateReport(url, analysis) {
  const report = []
  report.push(`\n=== SEO Analysis Report for ${url} ===\n`)
  
  const checks = [
    { key: 'title', label: '<title>', expected: 1 },
    { key: 'description', label: '<meta name="description">', expected: 1 },
    { key: 'ogTitle', label: '<meta property="og:title">', expected: 1 },
    { key: 'ogDescription', label: '<meta property="og:description">', expected: 1 },
    { key: 'ogImage', label: '<meta property="og:image">', expected: 1 },
    { key: 'ogUrl', label: '<meta property="og:url">', expected: 1 },
    { key: 'ogType', label: '<meta property="og:type">', expected: 1 },
    { key: 'twitterTitle', label: '<meta name="twitter:title">', expected: 1 },
    { key: 'twitterDescription', label: '<meta name="twitter:description">', expected: 1 },
    { key: 'twitterImage', label: '<meta name="twitter:image">', expected: 1 },
    { key: 'twitterCard', label: '<meta name="twitter:card">', expected: 1 },
    { key: 'canonical', label: '<link rel="canonical">', expected: 1 }
  ]
  
  let hasIssues = false
  
  for (const check of checks) {
    const values = analysis[check.key]
    const count = values.length
    const status = count === check.expected ? '✓' : '✗'
    
    if (count !== check.expected) {
      hasIssues = true
    }
    
    report.push(`${status} ${check.label}: Found ${count} (expected ${check.expected})`)
    
    if (count > 0) {
      values.forEach((value, index) => {
        const truncated = value.length > 80 ? value.substring(0, 80) + '...' : value
        report.push(`   [${index + 1}] ${truncated}`)
      })
    } else {
      report.push(`   [MISSING]`)
    }
    report.push('')
  }
  
  // Check for duplicates
  const duplicates = checks.filter(check => analysis[check.key].length > 1)
  if (duplicates.length > 0) {
    report.push('\n⚠️  DUPLICATE TAGS DETECTED:')
    duplicates.forEach(check => {
      report.push(`   - ${check.label}: ${analysis[check.key].length} instances`)
    })
    report.push('')
  }
  
  // Check if values look dynamic or default
  const title = analysis.title[0] || ''
  const ogTitle = analysis.ogTitle[0] || ''
  const isDynamic = title.includes("'s Music Library") || ogTitle.includes("'s Music Library")
  
  report.push(`\n📊 Assessment:`)
  report.push(`   Dynamic content detected: ${isDynamic ? 'YES ✓' : 'NO ✗ (showing defaults)'}`)
  report.push(`   Has issues: ${hasIssues ? 'YES ✗' : 'NO ✓'}`)
  report.push('')
  
  return { report: report.join('\n'), hasIssues, isDynamic }
}

async function main() {
  const url = process.argv[2]
  
  if (!url) {
    console.error('Usage: node scripts/diagnose-seo.js <url>')
    console.error('Example: node scripts/diagnose-seo.js https://beatbox.studio/u/madebyporter')
    process.exit(1)
  }
  
  console.log(`Fetching HTML from ${url}...`)
  
  try {
    const html = await fetchHTML(url)
    const head = extractHead(html)
    const analysis = analyzeMetaTags(head)
    const { report, hasIssues, isDynamic } = generateReport(url, analysis)
    
    console.log(report)
    
    // Save raw HTML and head for inspection
    const urlObj = new URL(url)
    const filename = urlObj.pathname.replace(/\//g, '_').replace(/^_/, '') || 'index'
    const outputDir = path.join(process.cwd(), 'diagnosis-output')
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    
    const htmlFile = path.join(outputDir, `${filename}_full.html`)
    const headFile = path.join(outputDir, `${filename}_head.html`)
    const reportFile = path.join(outputDir, `${filename}_report.txt`)
    
    fs.writeFileSync(htmlFile, html)
    fs.writeFileSync(headFile, head)
    fs.writeFileSync(reportFile, report)
    
    console.log(`\n📁 Files saved:`)
    console.log(`   - Full HTML: ${htmlFile}`)
    console.log(`   - Head section: ${headFile}`)
    console.log(`   - Report: ${reportFile}`)
    
    if (hasIssues || !isDynamic) {
      console.log(`\n⚠️  Issues detected! See report above.`)
      process.exit(1)
    } else {
      console.log(`\n✓ All checks passed!`)
      process.exit(0)
    }
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

main()

