const fs = require('fs');
const path = require('path');

async function generateStaticContent() {
  console.log('Generating static content for GitHub Pages...');
  
  try {
    // Create public/api directory
    const apiDir = path.join(process.cwd(), 'public', 'api');
    await fs.promises.mkdir(apiDir, { recursive: true });
    
    // Generate README content
    const readmePath = path.join(process.cwd(), 'README.md');
    const readmeContent = await fs.promises.readFile(readmePath, 'utf-8');
    
    // Simple markdown to HTML conversion for basic elements
    let htmlContent = readmeContent
      // Headers
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold text-white mb-2">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold text-white mb-3">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-white mb-4">$1</h1>')
      
      // Bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
      
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">$1</a>')
      
      // Images (for skill icons)
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="inline w-8 h-8 mx-1" />')
      
      // Lists
      .replace(/^- (.*$)/gm, '<li class="mb-1">• $1</li>')
      .replace(/^(\d+)\. (.*$)/gm, '<li class="mb-1">$1. $2</li>')
      
      // Paragraphs (split by double newlines)
      .split('\n\n')
      .map(paragraph => {
        if (paragraph.trim() === '') return '';
        if (paragraph.includes('<h1') || paragraph.includes('<h2') || paragraph.includes('<h3')) {
          return paragraph;
        }
        if (paragraph.includes('<li')) {
          return `<ul class="space-y-1 text-gray-300">${paragraph}</ul>`;
        }
        if (paragraph.includes('<img')) {
          return `<div class="flex flex-wrap items-center gap-1 mb-2">${paragraph}</div>`;
        }
        return `<p class="text-gray-300 leading-relaxed mb-4">${paragraph.replace(/\n/g, '<br/>')}</p>`;
      })
      .join('\n');

    // Write static README JSON
    const readmeData = { content: htmlContent };
    await fs.promises.writeFile(
      path.join(apiDir, 'readme.json'),
      JSON.stringify(readmeData, null, 2)
    );
    
    console.log('✓ Generated static README content');
    
  } catch (error) {
    console.error('Error generating static content:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  generateStaticContent();
}

module.exports = { generateStaticContent }; 