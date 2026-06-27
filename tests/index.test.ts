import { describe, it, expect } from 'vitest';
import {
  AITechnicalDebtCLI,
  TechnicalDebtAnalyzer,
  DebtSeverity
} from '../src/index';
import type {
  AnalysisMode,
  DebtType,
  DebtItem,
  ArchitecturalMetric,
  ComprehensionScore,
  VerificationAssessment,
  AIAttribution,
  AIAttributionPattern,
  PreventionGuardrail,
  DebtReport
} from '../src/index';

describe('index.ts exports', () => {
  it('should export AITechnicalDebtCLI class', () => {
    expect(AITechnicalDebtCLI).toBeDefined();
    expect(typeof AITechnicalDebtCLI).toBe('function');
  });

  it('should export TechnicalDebtAnalyzer class', () => {
    expect(TechnicalDebtAnalyzer).toBeDefined();
    expect(typeof TechnicalDebtAnalyzer).toBe('function');
  });

  it('should export DebtSeverity enum', () => {
    expect(DebtSeverity).toBeDefined();
    expect(DebtSeverity.CRITICAL).toBe('critical');
    expect(DebtSeverity.HIGH).toBe('high');
    expect(DebtSeverity.MEDIUM).toBe('medium');
    expect(DebtSeverity.LOW).toBe('low');
  });

  it('should create AITechnicalDebtCLI with default config', () => {
    const cli = new AITechnicalDebtCLI();
    expect(cli).toBeInstanceOf(AITechnicalDebtCLI);
    expect(cli.analyze).toBeDefined();
    expect(cli.generateReport).toBeDefined();
    expect(cli.scanAndPrevent).toBeDefined();
  });

  it('should create AITechnicalDebtCLI with custom config', () => {
    const cli = new AITechnicalDebtCLI({
      outputFormat: 'json',
      attributionEnabled: false
    });
    expect(cli).toBeInstanceOf(AITechnicalDebtCLI);
  });

  it('should have default export as AITechnicalDebtCLI', async () => {
    const mod = await import('../src/index');
    expect(mod.default).toBe(AITechnicalDebtCLI);
  });
});

describe('AITechnicalDebtCLI getSeverityEmoji', () => {
  it('should render all severity levels in console output', async () => {
    const cli = new AITechnicalDebtCLI({ outputFormat: 'console' });
    const severities = ['critical', 'high', 'medium', 'low'] as const;
    for (const severity of severities) {
      const report: DebtReport = {
        overallScore: 50,
        severity: severity as DebtSeverity,
        totalDebtItems: 1,
        estimatedCost: 100,
        affectedFiles: 1,
        debtTypes: [{
          name: 'comprehension',
          count: 1,
          items: [{ file: 'test.ts', line: 1, message: 'Test', severity: severity as DebtSeverity, category: 'comprehension' }],
          score: 50
        }],
        metrics: {
          architectural: { coupling: 0.3, cohesion: 0.7, complexity: 0.3, maintainability: 0.7 },
          comprehension: { clarity: 0.7, readability: 0.7, documentation: 0.7, overall: 0.7 },
          verification: { testCoverage: 0.7, testEffectiveness: 0.7, brittleness: 0.3, overall: 0.7 }
        },
        recommendations: [],
        timestamp: new Date().toISOString()
      };
      const output = await cli.generateReport(report);
      expect(output).toContain(severity);
    }
  });
});

describe('AITechnicalDebtCLI output formats', () => {
  it('should generate console output from empty report', async () => {
    const cli = new AITechnicalDebtCLI({ outputFormat: 'console' });
    const report: DebtReport = {
      overallScore: 100,
      severity: DebtSeverity.LOW,
      totalDebtItems: 0,
      estimatedCost: 0,
      affectedFiles: 0,
      debtTypes: [],
      metrics: {
        architectural: { coupling: 0.1, cohesion: 0.9, complexity: 0.1, maintainability: 0.9 },
        comprehension: { clarity: 0.9, readability: 0.9, documentation: 0.9, overall: 0.9 },
        verification: { testCoverage: 0.9, testEffectiveness: 0.8, brittleness: 0.1, overall: 0.85 }
      },
      recommendations: ['Code quality is good.'],
      timestamp: new Date().toISOString()
    };
    const output = await cli.generateReport(report);
    expect(output).toContain('AI Technical Debt Analysis Report');
    expect(output).toContain('100.00/100');
  });

  it('should generate markdown output', async () => {
    const cli = new AITechnicalDebtCLI({ outputFormat: 'markdown' });
    const report: DebtReport = {
      overallScore: 75,
      severity: DebtSeverity.MEDIUM,
      totalDebtItems: 2,
      estimatedCost: 1000,
      affectedFiles: 1,
      debtTypes: [{
        name: 'comprehension',
        count: 2,
        items: [
          { file: 'test.ts', line: 1, message: 'Test issue', severity: DebtSeverity.MEDIUM, category: 'comprehension' },
          { file: 'test.ts', line: 2, message: 'Another issue', severity: DebtSeverity.LOW, category: 'comprehension' }
        ],
        score: 50
      }],
      metrics: {
        architectural: { coupling: 0.3, cohesion: 0.7, complexity: 0.2, maintainability: 0.8 },
        comprehension: { clarity: 0.7, readability: 0.7, documentation: 0.8, overall: 0.73 },
        verification: { testCoverage: 0.8, testEffectiveness: 0.7, brittleness: 0.2, overall: 0.72 }
      },
      recommendations: ['Fix issue 1', 'Fix issue 2'],
      timestamp: new Date().toISOString()
    };
    const output = await cli.generateReport(report);
    expect(output).toContain('# AI Technical Debt Report');
    expect(output).toContain('**Overall Score**');
    expect(output).toContain('75.00/100');
    expect(output).toContain('## Executive Summary');
    expect(output).toContain('comprehension');
  });

  it('should generate JSON output', async () => {
    const cli = new AITechnicalDebtCLI({ outputFormat: 'json' });
    const report: DebtReport = {
      overallScore: 90,
      severity: DebtSeverity.LOW,
      totalDebtItems: 0,
      estimatedCost: 0,
      affectedFiles: 0,
      debtTypes: [],
      metrics: {
        architectural: { coupling: 0.1, cohesion: 0.9, complexity: 0.1, maintainability: 0.9 },
        comprehension: { clarity: 0.9, readability: 0.9, documentation: 0.9, overall: 0.9 },
        verification: { testCoverage: 0.9, testEffectiveness: 0.8, brittleness: 0.1, overall: 0.85 }
      },
      recommendations: ['All good'],
      timestamp: '2026-01-01T00:00:00.000Z'
    };
    const output = await cli.generateReport(report);
    const parsed = JSON.parse(output);
    expect(parsed.overallScore).toBe(90);
    expect(parsed.severity).toBe('low');
  });
});
