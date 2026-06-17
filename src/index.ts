import {
  TechnicalDebtAnalyzer,
  AnalysisMode,
  DebtReport,
  DebtType,
  AIAttribution,
  ArchitecturalMetric,
  ComprehensionScore,
  VerificationAssessment,
  DebtSeverity,
  PreventionGuardrail
} from './analyzer';

import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync
} from 'fs';
import { join, dirname } from 'path';

export interface AITechnicalDebtConfig {
  rootDir: string;
  analysisModes: AnalysisMode[];
  attributionEnabled: boolean;
  guardrails?: PreventionGuardrail[];
  outputFormat: 'json' | 'console' | 'markdown';
  thresholds: {
    complexity: number;
    coupling: number;
    coverage: number;
    maintainability: number;
  };
}

export class AITechnicalDebtCLI {
  private analyzer: TechnicalDebtAnalyzer;
  private config: AITechnicalDebtConfig;

  constructor(config: Partial<AITechnicalDebtConfig> = {}) {
    this.config = {
      rootDir: process.cwd(),
      analysisModes: ['comprehension', 'architectural', 'verification', 'quantification'],
      attributionEnabled: true,
      outputFormat: 'console',
      thresholds: {
        complexity: 0.7,
        coupling: 0.6,
        coverage: 0.8,
        maintainability: 0.75
      },
      ...config
    };

    this.analyzer = new TechnicalDebtAnalyzer(this.config);
  }

  async analyze(paths: string[] = ['.']): Promise<DebtReport> {
    return this.analyzer.analyze(paths);
  }

  async scanAndPrevent(): Promise<DebtReport> {
    return this.analyzer.scanAndPrevent();
  }

  async generateReport(report: DebtReport): Promise<string> {
    switch (this.config.outputFormat) {
      case 'json':
        return JSON.stringify(report, null, 2);
      case 'markdown':
        return this.generateMarkdownReport(report);
      case 'console':
      default:
        return this.generateConsoleReport(report);
    }
  }

  private generateConsoleReport(report: DebtReport): string {
    let output = '';
    
    output += `\n🔍 AI Technical Debt Analysis Report`;
    output += `\n${'='.repeat(50)}\n`;
    output += `📊 Overall Score: ${report.overallScore.toFixed(2)}/100\n`;
    output += `🚨 Severity: ${this.getSeverityEmoji(report.severity)} ${report.severity}\n`;
    
    if (report.totalDebtItems > 0) {
      output += `\n📈 Detected ${report.totalDebtItems} technical debt items:\n`;
      output += `💰 Estimated Cost: $${report.estimatedCost.toLocaleString()}\n`;
      
      report.debtTypes.forEach(type => {
        output += `\n🗂️  ${type.name}: ${type.count} items\n`;
        type.items.slice(0, 3).forEach(item => {
          output += `  • ${item.file}:${item.line}: ${item.message}\n`;
        });
        if (type.items.length > 3) {
          output += `  ... and ${type.items.length - 3} more\n`;
        }
      });
    } else {
      output += `\n✅ No significant technical debt detected.\n`;
    }

    if (report.aiAttribution?.patterns.length) {
      output += `\n🤖 AI Attribution:\n`;
      report.aiAttribution.patterns.slice(0, 5).forEach(pattern => {
        output += `  • ${pattern.pattern}: ${pattern.confidence.toFixed(2)} confidence\n`;
      });
    }

    if (report.recommendations.length > 0) {
      output += `\n💡 Recommendations:\n`;
      report.recommendations.slice(0, 5).forEach(rec => {
        output += `  • ${rec}\n`;
      });
    }

    return output;
  }

  private generateMarkdownReport(report: DebtReport): string {
    let markdown = `# AI Technical Debt Report\n\n`;
    markdown += `**Overall Score**: ${report.overallScore.toFixed(2)}/100\n`;
    markdown += `**Severity**: ${report.severity}\n`;
    markdown += `**Generated**: ${new Date().toISOString()}\n\n`;

    markdown += `## Executive Summary\n\n`;
    markdown += `- **Total Debt Items**: ${report.totalDebtItems}\n`;
    markdown += `- **Estimated Cost**: $${report.estimatedCost.toLocaleString()}\n`;
    markdown += `- **Affected Files**: ${report.affectedFiles}\n\n`;

    if (report.debtTypes.length > 0) {
      markdown += `## Technical Debt by Type\n\n`;
      report.debtTypes.forEach(type => {
        markdown += `### ${type.name}\n`;
        markdown += `**Count**: ${type.count}\n\n`;
        markdown += `#### Items\n\n`;
        type.items.forEach(item => {
          markdown += `- **${item.file}:${item.line}**: ${item.message}\n`;
          markdown += `  - Severity: ${item.severity}\n`;
          markdown += `  - Category: ${item.category}\n\n`;
        });
      });
    }

    if (report.recommendations.length > 0) {
      markdown += `## Recommendations\n\n`;
      report.recommendations.forEach(rec => {
        markdown += `- ${rec}\n`;
      });
    }

    return markdown;
  }

  private getSeverityEmoji(severity: DebtSeverity): string {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      case 'low': return '🔍';
      default: return '❓';
    }
  }
}

export { TechnicalDebtAnalyzer, AnalysisMode, DebtType, DebtSeverity };
export type { DebtItem, ArchitecturalMetric, ComprehensionScore, VerificationAssessment, AIAttribution, PreventionGuardrail, DebtReport };
export default AITechnicalDebtCLI;