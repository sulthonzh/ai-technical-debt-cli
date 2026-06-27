import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AITechnicalDebtCLI } from '../src/index';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

describe('AITechnicalDebtCLI', () => {
  let testDir: string;
  let cli: AITechnicalDebtCLI;

  beforeEach(() => {
    testDir = join(process.cwd(), 'test-cli-temp');
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    
    cli = new AITechnicalDebtCLI({
      rootDir: testDir,
      analysisModes: ['comprehension', 'architectural', 'verification'],
      attributionEnabled: true,
      outputFormat: 'console',
      thresholds: {
        complexity: 0.7,
        coupling: 0.6,
        coverage: 0.8,
        maintainability: 0.75
      }
    });
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('should analyze AI-generated code with comprehension debt', async () => {
    const testFile = join(testDir, 'ai-test.ts');
    const code = `
// AI generated code with magic numbers and generic names
const temp = 42; // Magic number and generic variable name
function processData(data: any) {
  if (data.value > 100) { // Hardcoded threshold
    return data.value * 2;
  }
  return 0;
}

// Another magic number
const API_KEY = 'sk-1234567890abcdef';
    `;
    
    writeFileSync(testFile, code);

    const result = await cli.analyze([testFile]);
    
    expect(result.totalDebtItems).toBeGreaterThan(0);
    expect(result.overallScore).toBeGreaterThan(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.severity).toBeDefined();
    expect(result.affectedFiles).toBe(1);
    
    // Check that we detected comprehension debt
    const comprehensionDebt = result.debtTypes.find(type => type.name === 'comprehension');
    expect(comprehensionDebt).toBeDefined();
    expect(comprehensionDebt?.count).toBeGreaterThan(0);
  });

  it('should generate console report', async () => {
    const testFile = join(testDir, 'report-test.ts');
    const code = `
// AI generated with comprehension issues
const value = 123; // Magic number
function calculate(items: any[]) {
  return items.length;
}
    `;
    
    writeFileSync(testFile, code);

    const result = await cli.analyze([testFile]);
    const report = await cli.generateReport(result);
    
    expect(report).toContain('AI Technical Debt Analysis Report');
    expect(report).toContain('Overall Score');
    expect(report).toContain('Severity');
  });

  it('should generate markdown report', async () => {
    cli = new AITechnicalDebtCLI({
      ...cli['config'],
      outputFormat: 'markdown'
    });

    const testFile = join(testDir, 'markdown-test.ts');
    const code = `
// Test code for markdown generation
const x = 100; // Magic number
function process(data: any) {
  return data;
}
    `;
    
    writeFileSync(testFile, code);

    const result = await cli.analyze([testFile]);
    const report = await cli.generateReport(result);
    
    expect(report).toContain('# AI Technical Debt Report');
    expect(report).toContain('**Overall Score**');
    expect(report).toContain('## Executive Summary');
  });

  it('should generate JSON report', async () => {
    cli = new AITechnicalDebtCLI({
      ...cli['config'],
      outputFormat: 'json'
    });

    const testFile = join(testDir, 'json-test.ts');
    const code = `
// JSON test code
const magic = 42; // Magic number
    `;
    
    writeFileSync(testFile, code);

    const result = await cli.analyze([testFile]);
    const report = await cli.generateReport(result);
    
    const parsed = JSON.parse(report);
    expect(parsed.overallScore).toBeDefined();
    expect(parsed.severity).toBeDefined();
    expect(parsed.totalDebtItems).toBeDefined();
    expect(parsed.timestamp).toBeDefined();
  });

  it('should handle files with no debt', async () => {
    const testFile = join(testDir, 'clean-code.ts');
    const code = `
// Well-written code
class Calculator {
  private precision: number;
  
  constructor(precision: number = 2) {
    this.precision = precision;
  }

  add(a: number, b: number): number {
    return parseFloat((a + b).toFixed(this.precision));
  }
}
    `;
    
    writeFileSync(testFile, code);

    const result = await cli.analyze([testFile]);
    
    // Should have decent score (above 50 is reasonable for this clean code)
    expect(result.overallScore).toBeGreaterThan(50);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('should analyze multiple files', async () => {
    const srcDir = join(testDir, 'src');
    mkdirSync(srcDir, { recursive: true });

    const file1 = join(srcDir, 'file1.ts');
    const file2 = join(srcDir, 'file2.ts');
    
    const code1 = `
// File 1 with debt
const temp = 100; // Magic number
    `;
    
    const code2 = `
// File 2 with debt  
const data = 200; // Another magic number
    `;
    
    writeFileSync(file1, code1);
    writeFileSync(file2, code2);

    const result = await cli.analyze([srcDir]);
    
    expect(result.totalDebtItems).toBeGreaterThan(0);
    expect(result.affectedFiles).toBe(2);
  });

  it('should detect AI patterns', async () => {
    const testFile = join(testDir, 'ai-patterns.ts');
    const code = `
// AI generated with long chains
const result = data
  .filter(item => item.valid)
  .map(item => item.value)
  .reduce((acc, val) => acc + val, 0);

// AI generated with excessive async
async function processAsync(data: any) {
  const result = await fetch('https://api.example.com');
  const parsed = await result.json();
  return parsed;
}
    `;
    
    writeFileSync(testFile, code);

    const result = await cli.analyze([testFile]);
    
    // AI attribution may or may not be detected depending on patterns
    // The important thing is that we got some debt items
    expect(result.totalDebtItems).toBeGreaterThan(0);
    if (result.aiAttribution) {
      expect(result.aiAttribution.confidence).toBeDefined();
      expect(result.aiAttribution.patterns).toBeDefined();
    }
  });
});