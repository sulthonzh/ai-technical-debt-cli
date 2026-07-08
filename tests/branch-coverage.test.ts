import { describe, it, expect } from 'vitest';
import { TechnicalDebtAnalyzer, AITechnicalDebtCLI, DebtSeverity } from '../src/index';
import type { DebtReport, DebtType, DebtSeverity as DS } from '../src/index';

/**
 * Targeted branch coverage tests for index.ts and analyzer.ts.
 * Covers: getSeverityEmoji default, formatText aiAttribution, items > 3,
 *         generateRecommendations all branches, suggestAITools, scanAndPrevent.
 */

interface AnalyzerPrivate {
  generateRecommendations: (debtTypes: DebtType[], metrics: DebtReport['metrics']) => string[];
  suggestAITools: (patterns: { pattern: string }[]) => string[];
}

interface CLIPrivate {
  getSeverityEmoji: (severity: string) => string;
  generateConsoleReport: (report: DebtReport) => string;
  generateMarkdownReport: (report: DebtReport) => string;
}

describe('Branch coverage: index.ts formatText', () => {
  const cli = new AITechnicalDebtCLI();
  const a = cli as unknown as CLIPrivate;

  it('getSeverityEmoji: default case for unknown severity', () => {
    expect(a.getSeverityEmoji('unknown')).toBe('❓');
    expect(a.getSeverityEmoji('critical')).toBe('🚨');
    expect(a.getSeverityEmoji('high')).toBe('⚠️');
    expect(a.getSeverityEmoji('medium')).toBe('⚡');
    expect(a.getSeverityEmoji('low')).toBe('🔍');
  });

  it('formatText: debtTypes with > 3 items triggers "and N more"', () => {
    const manyItems = Array.from({ length: 5 }, (_, i) => ({
      file: `file${i}.ts`,
      line: i + 1,
      message: `Issue ${i}`,
      severity: 'low' as DS,
      type: 'comprehension'
    }));

    const report: DebtReport = {
      overallScore: 50,
      severity: DebtSeverity.MEDIUM,
      totalDebtItems: 5,
      estimatedCost: 1000,
      affectedFiles: 5,
      debtTypes: [{
        name: 'comprehension',
        count: 5,
        score: 50,
        items: manyItems
      }],
      metrics: {
        architectural: { coupling: 0.3, cohesion: 0.7, complexity: 0.4, maintainability: 0.6 },
        comprehension: { clarity: 0.6, readability: 0.7, documentation: 0.5, overall: 0.6 },
        verification: { testCoverage: 0.7, testEffectiveness: 0.6, brittleness: 0.2, overall: 0.65 }
      },
      recommendations: ['Fix issues'],
      timestamp: new Date().toISOString()
    };

    const output = a.generateConsoleReport(report);
    expect(output).toContain('... and 2 more');
  });

  it('formatText: aiAttribution with patterns renders AI Attribution section', () => {
    const report: DebtReport = {
      overallScore: 50,
      severity: DebtSeverity.MEDIUM,
      totalDebtItems: 1,
      estimatedCost: 500,
      affectedFiles: 1,
      debtTypes: [{
        name: 'comprehension',
        count: 1,
        score: 50,
        items: [{ file: 'test.ts', line: 1, message: 'Bad code', severity: 'medium' as DS, type: 'comprehension' }]
      }],
      metrics: {
        architectural: { coupling: 0.3, cohesion: 0.7, complexity: 0.4, maintainability: 0.6 },
        comprehension: { clarity: 0.6, readability: 0.7, documentation: 0.5, overall: 0.6 },
        verification: { testCoverage: 0.7, testEffectiveness: 0.6, brittleness: 0.2, overall: 0.65 }
      },
      recommendations: ['Fix it'],
      aiAttribution: {
        patterns: [
          { pattern: 'longChains', confidence: 0.8, file: 'test.ts', line: 1 },
          { pattern: 'excessiveAsync', confidence: 0.6, file: 'test.ts', line: 2 }
        ],
        likelyTools: ['GitHub Copilot', 'ChatGPT']
      },
      timestamp: new Date().toISOString()
    };

    const output = a.generateConsoleReport(report);
    expect(output).toContain('🤖 AI Attribution:');
    expect(output).toContain('longChains');
    expect(output).toContain('0.80');
  });

  it('formatText: zero debt items shows "No significant technical debt"', () => {
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

  it('formatMarkdown: recommendations section renders when present', () => {
    const report: DebtReport = {
      overallScore: 40,
      severity: DebtSeverity.HIGH,
      totalDebtItems: 2,
      estimatedCost: 2000,
      affectedFiles: 2,
      debtTypes: [{
        name: 'architectural',
        count: 2,
        score: 40,
        items: [
          { file: 'a.ts', line: 1, message: 'Bad', severity: 'high' as DS, type: 'architectural' },
          { file: 'b.ts', line: 2, message: 'Worse', severity: 'critical' as DS, type: 'architectural' }
        ]
      }],
      metrics: {
        architectural: { coupling: 0.7, cohesion: 0.3, complexity: 0.8, maintainability: 0.3 },
        comprehension: { clarity: 0.5, readability: 0.4, documentation: 0.3, overall: 0.4 },
        verification: { testCoverage: 0.4, testEffectiveness: 0.3, brittleness: 0.5, overall: 0.35 }
      },
      recommendations: ['Refactor now', 'Add tests'],
      timestamp: new Date().toISOString()
    };

    const md = a.generateMarkdownReport(report);
    expect(md).toContain('## Recommendations');
    expect(md).toContain('- Refactor now');
    expect(md).toContain('- Add tests');
  });
});

describe('Branch coverage: analyzer.ts generateRecommendations', () => {
  const analyzer = new TechnicalDebtAnalyzer({});
  const a = analyzer as unknown as AnalyzerPrivate;

  it('triggers coupling > 0.6 recommendation', () => {
    const recs = a.generateRecommendations([], {
      architectural: { coupling: 0.8, cohesion: 0.3, complexity: 0.5, maintainability: 0.4 },
      comprehension: { clarity: 0.9, readability: 0.9, documentation: 0.9, overall: 0.9 },
      verification: { testCoverage: 0.9, testEffectiveness: 0.9, brittleness: 0.1, overall: 0.9 }
    });
    expect(recs).toContain('Refactor high-coupled modules. Consider dependency injection and interfaces.');
  });

  it('triggers clarity < 0.7 recommendation', () => {
    const recs = a.generateRecommendations([], {
      architectural: { coupling: 0.3, cohesion: 0.7, complexity: 0.3, maintainability: 0.7 },
      comprehension: { clarity: 0.5, readability: 0.5, documentation: 0.5, overall: 0.5 },
      verification: { testCoverage: 0.9, testEffectiveness: 0.9, brittleness: 0.1, overall: 0.9 }
    });
    expect(recs).toContain('Improve code clarity. Add meaningful variable names and comprehensive documentation.');
  });

  it('triggers testCoverage < 0.8 recommendation', () => {
    const recs = a.generateRecommendations([], {
      architectural: { coupling: 0.3, cohesion: 0.7, complexity: 0.3, maintainability: 0.7 },
      comprehension: { clarity: 0.9, readability: 0.9, documentation: 0.9, overall: 0.9 },
      verification: { testCoverage: 0.5, testEffectiveness: 0.5, brittleness: 0.3, overall: 0.5 }
    });
    expect(recs).toContain('Increase test coverage. Create comprehensive tests for AI-generated code.');
  });

  it('triggers comprehension score < 70 recommendation', () => {
    const debtTypes: DebtType[] = [{
      name: 'comprehension', count: 1, score: 50,
      items: [{ file: 'x.ts', line: 1, message: 'Unclear', severity: 'medium' as DS, type: 'comprehension' }]
    }];
    const recs = a.generateRecommendations(debtTypes, {
      architectural: { coupling: 0.3, cohesion: 0.7, complexity: 0.3, maintainability: 0.7 },
      comprehension: { clarity: 0.9, readability: 0.9, documentation: 0.9, overall: 0.9 },
      verification: { testCoverage: 0.9, testEffectiveness: 0.9, brittleness: 0.1, overall: 0.9 }
    });
    expect(recs).toContain('Review AI-generated code for comprehension issues. Focus on readability and maintainability.');
  });

  it('triggers architectural score < 70 recommendation', () => {
    const debtTypes: DebtType[] = [{
      name: 'architectural', count: 1, score: 50,
      items: [{ file: 'x.ts', line: 1, message: 'Tight coupling', severity: 'high' as DS, type: 'architectural' }]
    }];
    const recs = a.generateRecommendations(debtTypes, {
      architectural: { coupling: 0.3, cohesion: 0.7, complexity: 0.3, maintainability: 0.7 },
      comprehension: { clarity: 0.9, readability: 0.9, documentation: 0.9, overall: 0.9 },
      verification: { testCoverage: 0.9, testEffectiveness: 0.9, brittleness: 0.1, overall: 0.9 }
    });
    expect(recs).toContain('Address architectural violations. Consider refactoring to align with SOLID principles.');
  });

  it('returns default recommendation when all metrics are good', () => {
    const recs = a.generateRecommendations([], {
      architectural: { coupling: 0.3, cohesion: 0.7, complexity: 0.3, maintainability: 0.7 },
      comprehension: { clarity: 0.9, readability: 0.9, documentation: 0.9, overall: 0.9 },
      verification: { testCoverage: 0.9, testEffectiveness: 0.9, brittleness: 0.1, overall: 0.9 }
    });
    expect(recs).toContain('Code quality is good. Consider implementing CI/CD checks for technical debt prevention.');
  });
});

describe('Branch coverage: analyzer.ts scanAndPrevent', () => {
  it('returns a valid DebtReport with prevention data', async () => {
    const analyzer = new TechnicalDebtAnalyzer({});
    const report = await analyzer.scanAndPrevent();

    expect(report.overallScore).toBe(85);
    expect(report.severity).toBe(DebtSeverity.LOW);
    expect(report.totalDebtItems).toBe(0);
    expect(report.estimatedCost).toBe(0);
    expect(report.affectedFiles).toBe(0);
    expect(report.debtTypes).toEqual([]);
    expect(report.recommendations).toContain('No technical debt detected. Code quality is good.');
    expect(report.timestamp).toBeTruthy();
  });
});
