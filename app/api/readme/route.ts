import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const readmePath = join(process.cwd(), 'README.md');
    const readmeContent = await readFile(readmePath, 'utf-8');
    
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

    return NextResponse.json({ content: htmlContent });
  } catch (error) {
    console.error('Error reading README:', error);
    return NextResponse.json({ error: 'Failed to read README' }, { status: 500 });
  }
} 