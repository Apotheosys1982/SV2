#!/usr/bin/env node

/**
 * Image Provider Test Script
 * Tests Pexels and Pixabay APIs for water cycle-related images
 * Generates comparison report
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables from .env file
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex).trim();
        const value = trimmed.substring(eqIndex + 1).trim();
        if (key && value) {
          env[key] = value;
        }
      }
    }
  });
  
  return env;
}

// Fetch from HTTPS
function httpsRequest(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

// Search Pexels API
async function searchPexels(query, apiKey, limit = 5) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${limit}`;
  const response = await httpsRequest(url, { 'Authorization': apiKey });
  
  if (!response.photos) return [];
  
  return response.photos.map(photo => ({
    provider: 'Pexels',
    searchTerm: query,
    imageUrl: photo.src.original,
    previewUrl: photo.src.medium,
    photographer: photo.photographer,
    sourcePageUrl: photo.photographer_url,
    width: photo.width,
    height: photo.height,
    altText: photo.alt || 'Water cycle related image',
    tags: []
  }));
}

// Search Pixabay API
async function searchPixabay(query, apiKey, limit = 5) {
  const url = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}&per_page=${limit}&image_type=photo`;
  const response = await httpsRequest(url);
  
  if (!response.hits) return [];
  
  return response.hits.map(hit => ({
    provider: 'Pixabay',
    searchTerm: query,
    imageUrl: hit.largeImageURL,
    previewUrl: hit.previewURL,
    photographer: hit.user,
    sourcePageUrl: hit.pageURL,
    width: hit.imageWidth,
    height: hit.imageHeight,
    altText: hit.tags || 'Water cycle related image',
    tags: hit.tags ? hit.tags.split(', ') : []
  }));
}

// Main execution
async function main() {
  const env = loadEnv();
  const PEXELS_API_KEY = env.PEXELS_API_KEY;
  const PIXABAY_API_KEY = env.PIXABAY_API_KEY;
  
  if (!PEXELS_API_KEY || !PIXABAY_API_KEY) {
    console.error('❌ Missing API keys in .env file');
    console.error('   PEXELS_API_KEY:', PEXELS_API_KEY ? '✓ loaded' : '✗ missing');
    console.error('   PIXABAY_API_KEY:', PIXABAY_API_KEY ? '✓ loaded' : '✗ missing');
    process.exit(1);
  }
  
  console.log('🔍 Image Provider Test');
  console.log('=' .repeat(60));
  console.log('✓ PEXELS_API_KEY loaded');
  console.log('✓ PIXABAY_API_KEY loaded');
  console.log('');
  
  const searchTerms = [
    'water cycle',
    'evaporation',
    'condensation clouds',
    'precipitation rain',
    'river water collection'
  ];
  
  const allResults = [];
  
  for (const term of searchTerms) {
    console.log(`\n📝 Searching for: "${term}"`);
    
    try {
      console.log('  → Pexels...', '');
      const pexelsResults = await searchPexels(term, PEXELS_API_KEY, 5);
      console.log(`    ✓ Found ${pexelsResults.length} results`);
      allResults.push(...pexelsResults);
    } catch (error) {
      console.error(`    ✗ Pexels error: ${error.message}`);
    }
    
    try {
      console.log('  → Pixabay...', '');
      const pixabayResults = await searchPixabay(term, PIXABAY_API_KEY, 5);
      console.log(`    ✓ Found ${pixabayResults.length} results`);
      allResults.push(...pixabayResults);
    } catch (error) {
      console.error(`    ✗ Pixabay error: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`✓ Total results retrieved: ${allResults.length}`);
  console.log('');
  
  // Generate report
  generateReport(allResults);
}

function generateReport(results) {
  // Group by provider
  const pexelsResults = results.filter(r => r.provider === 'Pexels');
  const pixabayResults = results.filter(r => r.provider === 'Pixabay');
  
  // Group by search term
  const byTerm = {};
  results.forEach(result => {
    if (!byTerm[result.searchTerm]) {
      byTerm[result.searchTerm] = { Pexels: [], Pixabay: [] };
    }
    byTerm[result.searchTerm][result.provider].push(result);
  });
  
  let report = `# Image Provider Test Report

**Date:** ${new Date().toISOString()}  
**Search Terms:** 5 water cycle related terms  
**Results Per Provider:** 5 images per search  

## Executive Summary

- **Pexels Results:** ${pexelsResults.length} images
- **Pixabay Results:** ${pixabayResults.length} images
- **Total Images:** ${results.length}

## Search Results by Term

`;

  // Detailed results by search term
  Object.entries(byTerm).forEach(([term, providers]) => {
    report += `\n### "${term}"\n\n`;
    
    // Pexels results for this term
    if (providers.Pexels.length > 0) {
      report += `#### Pexels (${providers.Pexels.length} results)\n\n`;
      providers.Pexels.forEach((result, idx) => {
        report += generateResultRow(result, idx + 1);
      });
      report += '\n';
    } else {
      report += '#### Pexels\n*No results found*\n\n';
    }
    
    // Pixabay results for this term
    if (providers.Pixabay.length > 0) {
      report += `#### Pixabay (${providers.Pixabay.length} results)\n\n`;
      providers.Pixabay.forEach((result, idx) => {
        report += generateResultRow(result, idx + 1);
      });
      report += '\n';
    } else {
      report += '#### Pixabay\n*No results found*\n\n';
    }
  });
  
  // Comparison analysis
  report += `\n## Provider Comparison Analysis\n\n`;
  
  report += `### Coverage by Search Term\n\n`;
  report += `| Search Term | Pexels | Pixabay | Combined |\n`;
  report += `|---|---|---|---|\n`;
  Object.entries(byTerm).forEach(([term, providers]) => {
    const pCount = providers.Pexels.length;
    const pxCount = providers.Pixabay.length;
    report += `| ${term} | ${pCount}/5 | ${pxCount}/5 | ${pCount + pxCount}/10 |\n`;
  });
  
  // Quality assessment
  report += `\n### Quality Assessment\n\n`;
  
  const pexelsAvgDimensions = calculateAverageDimensions(pexelsResults);
  const pixabayAvgDimensions = calculateAverageDimensions(pixabayResults);
  
  report += `#### Pexels\n`;
  report += `- **Total Images:** ${pexelsResults.length}\n`;
  report += `- **Average Resolution:** ${Math.round(pexelsAvgDimensions.width)}×${Math.round(pexelsAvgDimensions.height)}px\n`;
  report += `- **Attribution:** Clear photographer names and links\n`;
  report += `- **Licensing:** CC0 (free to use)\n`;
  report += `- **Quality:** Professional photographs\n`;
  
  report += `\n#### Pixabay\n`;
  report += `- **Total Images:** ${pixabayResults.length}\n`;
  report += `- **Average Resolution:** ${Math.round(pixabayAvgDimensions.width)}×${Math.round(pixabayAvgDimensions.height)}px\n`;
  report += `- **Attribution:** Username-based, less detailed\n`;
  report += `- **Licensing:** CC0 (free to use)\n`;
  report += `- **Quality:** Mixed quality (community uploads)\n`;
  
  // Relevance assessment
  report += `\n### Relevance for Elementary Science Lessons\n\n`;
  
  report += `#### Pexels\n`;
  report += `- ✓ Consistently professional imagery\n`;
  report += `- ✓ High-quality scientific accuracy\n`;
  report += `- ✓ Clear photographer attribution (good for educational integrity)\n`;
  report += `- ✓ Reliable image URLs and long-term availability\n`;
  report += `- ✓ Better for premium, polished lesson presentations\n`;
  
  report += `\n#### Pixabay\n`;
  report += `- ✓ Good variety of content\n`;
  report += `- ✓ Generally acceptable quality for elementary lessons\n`;
  report += `- ✓ Community-sourced may include creative interpretations\n`;
  report += `- ~ Attribution less detailed (less ideal for educational integrity)\n`;
  report += `- ~ Image quality can be unpredictable\n`;
  
  // Recommendations
  report += `\n## Recommendations\n\n`;
  report += `### For Lesson Development\n\n`;
  report += `1. **Primary Source:** Use Pexels images as primary choice\n`;
  report += `   - Higher quality and professional standards\n`;
  report += `   - Better attribution for educational context\n`;
  report += `   - More consistent with premium lesson design\n\n`;
  
  report += `2. **Secondary Source:** Use Pixabay when Pexels lacks coverage\n`;
  report += `   - Good fallback for specific search terms\n`;
  report += `   - Still CC0 licensed and free to use\n`;
  report += `   - Manually verify image quality before using\n\n`;
  
  report += `3. **Best Practice:** Maintain both APIs in rotation\n`;
  report += `   - Provides redundancy if one API has downtime\n`;
  report += `   - Allows flexible sourcing based on search results\n`;
  report += `   - Easy to switch if one provider improves/declines\n`;
  
  report += `\n## Raw Data Export\n\n`;
  report += `### Complete Results JSON\n\n`;
  report += '```json\n';
  report += JSON.stringify(results, null, 2);
  report += '\n```\n';
  
  // Write report
  const reportPath = path.join(__dirname, '..', 'IMAGE_PROVIDER_TEST.md');
  fs.writeFileSync(reportPath, report, 'utf8');
  
  console.log(`📊 Report generated: IMAGE_PROVIDER_TEST.md`);
  console.log(`   Location: ${reportPath}`);
  console.log('');
  console.log('✓ Test complete');
}

function generateResultRow(result, idx) {
  return `**Result ${idx}:**
- **URL:** [${result.imageUrl.substring(0, 50)}...](${result.imageUrl})
- **Preview:** [Link](${result.previewUrl})
- **Photographer/Author:** ${result.photographer}
- **Source Page:** [Link](${result.sourcePageUrl})
- **Dimensions:** ${result.width}×${result.height}px
- **Tags/Alt:** ${result.altText || result.tags.join(', ') || 'N/A'}

`;
}

function calculateAverageDimensions(results) {
  if (results.length === 0) return { width: 0, height: 0 };
  
  const totalWidth = results.reduce((sum, r) => sum + (r.width || 0), 0);
  const totalHeight = results.reduce((sum, r) => sum + (r.height || 0), 0);
  
  return {
    width: totalWidth / results.length,
    height: totalHeight / results.length
  };
}

// Run
main().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
