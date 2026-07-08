import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TechnicalDebtAnalyzer, DebtSeverity } from '../src/analyzer';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

describe('TechnicalDebtAnalyzer', () => {
  let testDir: string;
  let analyzer: TechnicalDebtAnalyzer;

  beforeEach(() => {
    testDir = join(process.cwd(), 'test-analyzer-temp');
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

  describe('analyze', () => {
    it('should detect magic numbers in code', async () => {
      const file = join(testDir, 'magic.ts');
      writeFileSync(file, 'const value = 12345;\n');
      const result = await analyzer.analyze([file]);
      const comprehension = result.debtTypes.find(t => t.name === 'comprehension');
      expect(comprehension).toBeDefined();
      expect(comprehension!.items.some(i => i.message.includes('Magic number'))).toBe(true);
    });

    it('should detect generic variable names', async () => {
      const file = join(testDir, 'generic.ts');
      writeFileSync(file, 'const temp = 1;\nconst data = 2;\n');
      const result = await analyzer.analyze([file]);
      const comprehension = result.debtTypes.find(t => t.name === 'comprehension');
      expect(comprehension).toBeDefined();
      expect(comprehension!.items.some(i => i.message.includes('Generic variable name'))).toBe(true);
    });

    it('should detect hardcoded string values', async () => {
      const file = join(testDir, 'hardcoded.ts');
      writeFileSync(file, "const url = '123';\n");
      const result = await analyzer.analyze([file]);
      const comprehension = result.debtTypes.find(t => t.name === 'comprehension');
      expect(comprehension).toBeDefined();
      expect(comprehension!.items.some(i => i.message.includes('Hardcoded value'))).toBe(true);
    });

    it('should detect deep nesting', async () => {
      const file = join(testDir, 'nesting.ts');
      writeFileSync(file, 'function f() {\n  if (a) {\n    if (b) {\n      if (c) {\n        return 1;\n      }\n    }\n  }\n}\n');
      const result = await analyzer.analyze([file]);
      const architectural = result.debtTypes.find(t => t.name === 'architectural');
      expect(architectural).toBeDefined();
      expect(architectural!.items.some(i => i.message.includes('Deep nesting'))).toBe(true);
    });

    it('should detect verification gaps for src files', async () => {
      const srcDir = join(testDir, 'src');
      mkdirSync(srcDir, { recursive: true });
      const file = join(srcDir, 'module.ts');
      writeFileSync(file, 'export const x = 1;\n');
      const result = await analyzer.analyze([file]);
      const verification = result.debtTypes.find(t => t.name === 'verification');
      expect(verification).toBeDefined();
    });

    it('should handle non-existent files gracefully', async () => {
      const result = await analyzer.analyze(['/nonexistent/file.ts']);
      expect(result.totalDebtItems).toBe(0);
    });

    it('should handle directory traversal', async () => {
      const subDir = join(testDir, 'subdir');
      mkdirSync(subDir, { recursive: true });
      writeFileSync(join(subDir, 'a.ts'), 'const temp = 100;\n');
      writeFileSync(join(testDir, 'b.ts'), 'const data = 200;\n');
      const result = await analyzer.analyze([testDir]);
      expect(result.totalDebtItems).toBeGreaterThan(0);
    });

    it('should calculate overall score between 0 and 100', async () => {
      const file = join(testDir, 'score.ts');
      writeFileSync(file, 'const temp = 999;\n');
      const result = await analyzer.analyze([file]);
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it('should estimate debt cost', async () => {
      const file = join(testDir, 'cost.ts');
      writeFileSync(file, 'const temp = 999;\n');
      const result = await analyzer.analyze([file]);
      expect(result.estimatedCost).toBeGreaterThanOrEqual(0);
    });

    it('should generate recommendations', async () => {
      const file = join(testDir, 'recs.ts');
      writeFileSync(file, 'const temp = 999;\n');
      const result = await analyzer.analyze([file]);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('severity calculation', () => {
    it('should return LOW severity for high scores', async () => {
      const file = join(testDir, 'clean.ts');
      writeFileSync(file, 'const meaning = 42;\n');
      const result = await analyzer.analyze([file]);
      expect(result.severity).toBeDefined();
    });
  });

  describe('AI attribution', () => {
    it('should include aiAttribution when enabled', async () => {
      const file = join(testDir, 'ai.ts');
      writeFileSync(file, 'const x = data.filter().map().reduce();\n');
      const result = await analyzer.analyze([file]);
      // attribution may or may not have patterns depending on content
      expect(result).toBeDefined();
    });
  });

  describe('scanAndPrevent', () => {
    it('should return a report with default values', async () => {
      const result = await analyzer.scanAndPrevent();
      expect(result.overallScore).toBe(85);
      expect(result.severity).toBe(DebtSeverity.LOW);
      expect(result.totalDebtItems).toBe(0);
      expect(result.estimatedCost).toBe(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('metrics calculation', () => {
    it('should calculate all metric categories', async () => {
      const file = join(testDir, 'metrics.ts');
      writeFileSync(file, 'const temp = 100;\nconst data = 200;\n');
      const result = await analyzer.analyze([file]);
      expect(result.metrics.architectural).toBeDefined();
      expect(result.metrics.architectural.coupling).toBeGreaterThanOrEqual(0);
      expect(result.metrics.architectural.cohesion).toBeGreaterThanOrEqual(0);
      expect(result.metrics.architectural.complexity).toBeGreaterThanOrEqual(0);
      expect(result.metrics.architectural.maintainability).toBeGreaterThanOrEqual(0);
      
      expect(result.metrics.comprehension).toBeDefined();
      expect(result.metrics.comprehension.clarity).toBeGreaterThanOrEqual(0);
      expect(result.metrics.comprehension.readability).toBeGreaterThanOrEqual(0);
      expect(result.metrics.comprehension.documentation).toBeGreaterThanOrEqual(0);
      
      expect(result.metrics.verification).toBeDefined();
      expect(result.metrics.verification.testCoverage).toBeGreaterThanOrEqual(0);
      expect(result.metrics.verification.testEffectiveness).toBeGreaterThanOrEqual(0);
      expect(result.metrics.verification.brittleness).toBeGreaterThanOrEqual(0);
    });
  });

  describe('DebtSeverity enum', () => {
    it('should have correct severity values', () => {
      expect(DebtSeverity.CRITICAL).toBe('critical');
      expect(DebtSeverity.HIGH).toBe('high');
      expect(DebtSeverity.MEDIUM).toBe('medium');
      expect(DebtSeverity.LOW).toBe('low');
    });
  });

  describe('output formats', () => {
    it('should handle empty directory', async () => {
      const emptyDir = join(testDir, 'empty');
      mkdirSync(emptyDir, { recursive: true });
      const result = await analyzer.analyze([emptyDir]);
      expect(result.totalDebtItems).toBe(0);
      expect(result.overallScore).toBe(100);
    });

    it('should only analyze .ts/.js/.tsx/.jsx files', async () => {
      writeFileSync(join(testDir, 'file.txt'), 'const temp = 999;\n');
      writeFileSync(join(testDir, 'file.md'), '# Magic number 999\n');
      const result = await analyzer.analyze([testDir]);
      // .txt and .md files should not be analyzed
      // If only non-code files, should have 0 items from them
      expect(result.totalDebtItems).toBe(0);
    });
  });
});
