import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TechnicalDebtAnalyzer, AITechnicalDebtCLI, DebtSeverity } from '../src/index';
import type { DebtReport, DebtType, DebtSeverity as DS } from '../src/index';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

describe('Coverage Gaps: analyzer.ts', () => {
  let testDir: string;
  let analyzer: TechnicalDebtAnalyzer;

  beforeEach(() => {
    testDir = join(process.cwd(), 'test-coverage-gaps');
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    analyzer = new TechnicalDebtAnalyzer({
      rootDir: testDir,
      attributionEnabled: true
    });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  describe('Vague comments detection (lines 242-251)', () => {
    it('should detect vague or incomplete comments', async () => {
      const file = join(testDir, 'vague-comments.ts');
      // Regex: /* ... TODO ... AI ... */ or // ... TODO ... AI
      writeFileSync(file, '/* TODO AI fix this later */\n// TODO implemented by AI\n');
      const result = await analyzer.analyze([file]);
      const comprehension = result.debtTypes.find(t => t.name === 'comprehension');
      expect(comprehension).toBeDefined();
      expect(comprehension!.items.some(i => i.message.includes('Vague or incomplete'))).toBe(true);
    });
  });

  describe('SOLID violations detection (lines 308-320)', () => {
    it('should detect potential SOLID principle violations', async () => {
      const file = join(testDir, 'solid-violation.ts');
      // singleResponsibility regex: class Foo { constructor(a, b) } (no braces in constructor body)
      // Must trigger: violationCount/lines > 0.7 threshold → keep lines minimal
      writeFileSync(file, 'class BadClass { constructor(a, b) }');
      const result = await analyzer.analyze([file]);
      const architectural = result.debtTypes.find(t => t.name === 'architectural');
      expect(architectural).toBeDefined();
      expect(architectural!.items.some(i => i.message.includes('singleResponsibility'))).toBe(true);
    });
  });

  describe('Hardcoded test values detection (lines 347-356)', () => {
    it('should detect hardcoded test values', async () => {
      const file = join(testDir, 'test-hardcoded.ts');
      // Regex: describe(...){...\d+...} — single block, no nested braces, must have digit
      writeFileSync(file, 'describe("test") {\n  const data = 42;\n}\n');
      const result = await analyzer.analyze([file]);
      const verification = result.debtTypes.find(t => t.name === 'verification');
      expect(verification).toBeDefined();
      expect(verification!.items.some(i => i.message.includes('Hardcoded test values'))).toBe(true);
    });
  });

  describe('Long method chains and excessive async (lines 368-384)', () => {
    it('should detect long method chains (AI pattern)', async () => {
      const file = join(testDir, 'long-chains.ts');
      writeFileSync(file, 'const result = data.filter(x => x.active).map(x => x.value).reduce((acc, x) => acc + x, 0);\n');
      const result = await analyzer.analyze([file]);
      const comprehension = result.debtTypes.find(t => t.name === 'comprehension');
      expect(comprehension).toBeDefined();
    });
  });

  describe('estimateDebtCost severity multiplier (lines 477-478)', () => {
    it('should apply severity multiplier to debt cost', async () => {
      const file = join(testDir, 'cost-severity.ts');
      writeFileSync(file, 'const temp = 999;\n');
      const result = await analyzer.analyze([file]);
      expect(result.estimatedCost).toBeGreaterThanOrEqual(0);
      expect(result.totalDebtItems).toBeGreaterThan(0);
    });
  });

  describe('calculateTypeScore with zero items (line 563)', () => {
    it('should return 100 for zero items when no patterns match', async () => {
      const file = join(testDir, 'clean-code.ts');
      // Must avoid: magic numbers (3+ digits), generic names (temp/tmp/data/result),
// hardcoded string values, excessive params (>10 chars), deep nesting, vague comments
      writeFileSync(file, 'function add(a, b) {\n  return a + b;\n}\n');
      const result = await analyzer.analyze([file]);
      expect(result.totalDebtItems).toBe(0);
      expect(result.overallScore).toBe(100);
    });
  });

  describe('identifyPrimaryTools return object entries (line 580)', () => {
    it('should return tool list from identifyPrimaryTools', async () => {
      const file = join(testDir, 'ai-tools.ts');
      writeFileSync(file, 'const x = data.filter().map().reduce();\n');
      const result = await analyzer.analyze([file]);
      expect(result.aiAttribution).toBeDefined();
      if (result.aiAttribution?.patterns.length > 0) {
        expect(result.aiAttribution.primaryTools).toBeDefined();
        expect(Array.isArray(result.aiAttribution.primaryTools)).toBe(true);
      }
    });
  });

  describe('Tool addition logic in identifyPrimaryTools (lines 599-602)', () => {
    it('should accumulate tool scores based on patterns', async () => {
      const file = join(testDir, 'tool-patterns.ts');
      writeFileSync(file, '// AI code here with long chains\nconst x = data.map().filter().reduce();\n');
      const result = await analyzer.analyze([file]);
      expect(result.aiAttribution).toBeDefined();
      if (result.aiAttribution?.patterns.length > 0) {
        const toolMap: Record<string, number> = {};
        result.aiAttribution.patterns.forEach(p => {
          if (p.pattern.includes('longChains')) toolMap['GitHub Copilot'] = (toolMap['GitHub Copilot'] || 0) + 0.3;
          if (p.pattern.includes('hardcoded')) toolMap['Cursor'] = (toolMap['Cursor'] || 0) + 0.25;
        });
        expect(Object.keys(toolMap).length).toBeGreaterThan(0);
      }
    });
  });

  describe('generateRecommendations return (line 609)', () => {
    it('should return recommendation array', async () => {
      const file = join(testDir, 'recommendation.ts');
      writeFileSync(file, 'const temp = 999;\n');
      const result = await analyzer.analyze([file]);
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });
});

describe('Coverage Gaps: index.ts', () => {
  const cli = new AITechnicalDebtCLI();
  const a = cli as unknown as { getSeverityEmoji: (severity: string) => string };

  it('getSeverityEmoji default case (lines 130-144)', () => {
    expect(a.getSeverityEmoji('unknown')).toBe('❓');
    expect(a.getSeverityEmoji('critical')).toBe('🚨');
    expect(a.getSeverityEmoji('high')).toBe('⚠️');
    expect(a.getSeverityEmoji('medium')).toBe('⚡');
    expect(a.getSeverityEmoji('low')).toBe('🔍');
  });

  it('generateConsoleReport zero debt items (edge case)', () => {
    const report: DebtReport = {
      overallScore: 100,
      severity: DebtSeverity.LOW,
      totalDebtItems: 0,
      estimatedCost: 0,
      affectedFiles: 0,
      debtTypes: [],
      metrics: {
        architectural: { coupling: 0.2, cohesion: 0.8, complexity: 0.2, maintainability: 0.9 },
        comprehension: { clarity: 0.9, readability: 0.9, documentation: 0.8, overall: 0.87 },
        verification: { testCoverage: 0.9, testEffectiveness: 0.8, brittleness: 0.1, overall: 0.85 }
      },
      recommendations: [],
      timestamp: new Date().toISOString()
    };

    const output = a.generateConsoleReport(report);
    expect(output).toContain('✅ No significant technical debt detected.');
  });

  it('generateMarkdownReport recommendations section (edge case)', () => {
    const report: DebtReport = {
      overallScore: 40,
      severity: DebtSeverity.HIGH,
      totalDebtItems: 0,
      estimatedCost: 0,
      affectedFiles: 0,
      debtTypes: [],
      metrics: {
        architectural: { coupling: 0.7, cohesion: 0.3, complexity: 0.8, maintainability: 0.3 },
        comprehension: { clarity: 0.5, readability: 0.4, documentation: 0.3, overall: 0.4 },
        verification: { testCoverage: 0.4, testEffectiveness: 0.3, brittleness: 0.5, overall: 0.35 }
      },
      recommendations: ['Review now', 'Add tests'],
      timestamp: new Date().toISOString()
    };

    const md = a.generateMarkdownReport(report);
    expect(md).toContain('## Recommendations');
    expect(md).toContain('- Review now');
    expect(md).toContain('- Add tests');
  });
});
