export type AnalysisMode = 'comprehension' | 'architectural' | 'verification' | 'quantification';

export interface DebtItem {
  file: string;
  line: number;
  message: string;
  severity: DebtSeverity;
  category: string;
  aiConfidence?: number;
  estimatedCost?: number;
  fixSuggestions?: string[];
}

export interface DebtType {
  name: string;
  count: number;
  items: DebtItem[];
  score: number;
}

export interface ArchitecturalMetric {
  coupling: number;
  cohesion: number;
  complexity: number;
  maintainability: number;
}

export interface ComprehensionScore {
  clarity: number;
  readability: number;
  documentation: number;
  overall: number;
}

export interface VerificationAssessment {
  testCoverage: number;
  testEffectiveness: number;
  brittleness: number;
  overall: number;
}

export interface AIAttribution {
  patterns: AIAttributionPattern[];
  confidence: number;
  primaryTools: string[];
}

export interface AIAttributionPattern {
  pattern: string;
  confidence: number;
  frequency: number;
  examples: string[];
}

export interface PreventionGuardrail {
  name: string;
  enabled: boolean;
  rule: (code: string, context: any) => boolean;
  violationMessage: string;
}

export enum DebtSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export interface DebtReport {
  overallScore: number;
  severity: DebtSeverity;
  totalDebtItems: number;
  estimatedCost: number;
  affectedFiles: number;
  debtTypes: DebtType[];
  aiAttribution?: AIAttribution;
  metrics: {
    architectural: ArchitecturalMetric;
    comprehension: ComprehensionScore;
    verification: VerificationAssessment;
  };
  recommendations: string[];
  timestamp: string;
}

import {
  readdirSync,
  readFileSync,
  statSync,
  existsSync
} from 'fs';
import { join, extname } from 'path';

const AI_PATTERNS = {
  magicNumbers: /[0-9]{3,}/g,
  longChains: /\.\s*\.\s*\./g,
  excessiveMethods: /\basync\s+\w+\s*\([^)]*\)\s*{[^}]{200,}/g,
  genericNames: /\b(temp|tmp|null|data|result)\b/g,
  excessiveParams: /\w+\([^)]{10,}\)/g,
  deepNesting: /{[^{}]*{[^{}]*{[^{}]*}/g,
  hardcodedValues: /(['"`])\d+\1/g,
  vagueComments: /(\/\*[^*]*\*+([^/*][^*]*\*+)*\/\s*)|\/\/.*TODO.*AI/g,
  excessiveImports: /import.*from.*['"`][^'"`]{50,}/g
};

const SOLID_VIOLATIONS = {
  singleResponsibility: {
    patterns: [/class\s+\w+\s*{[^}]*\s+constructor\([^)]*\)[^{]*\s+[^{]*}/g],
    threshold: 0.7
  },
  openClosed: {
    patterns: [/if\s*\([^)]*\)\s*{[^}]*}/g],
    threshold: 0.3
  },
  liskovSubstitution: {
    patterns: [/override|@override/g],
    threshold: 0.1
  },
  interfaceSegregation: {
    patterns: [/interface\s+\w+\s*{[^}]*{[^}]*}/g],
    threshold: 0.5
  },
  dependencyInversion: {
    patterns: [/new\s+\w+\s*\([^)]*\)/g],
    threshold: 0.4
  }
};

export class TechnicalDebtAnalyzer {
  private config: {
    rootDir: string;
    attributionEnabled: boolean;
    guardrails: PreventionGuardrail[];
    thresholds: Record<string, number>;
  };

  constructor(config: any) {
    this.config = config;
  }

  async analyze(paths: string[]): Promise<DebtReport> {
    const startTime = Date.now();
    
    const allFiles = this.getAllFiles(paths);
    const debtItems: DebtItem[] = [];
    const aiPatterns: AIAttributionPattern[] = [];
    
    for (const file of allFiles) {
      const analysis = await this.analyzeFile(file);
      debtItems.push(...analysis.debtItems);
      aiPatterns.push(...analysis.aiPatterns);
    }

    const report = this.generateReport(debtItems, aiPatterns, Date.now() - startTime);
    
    if (this.config.attributionEnabled) {
      report.aiAttribution = this.generateAIAttribution(aiPatterns);
    }

    return report;
  }

  private async analyzeFile(filePath: string): Promise<{
    debtItems: DebtItem[];
    aiPatterns: AIAttributionPattern[];
  }> {
    const debtItems: DebtItem[] = [];
    const aiPatterns: AIAttributionPattern[] = [];

    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      // Comprehension Debt Analysis
      const comprehensionDebt = this.analyzeComprehensionDebt(content, filePath, lines);
      debtItems.push(...comprehensionDebt);

      // Architectural Debt Analysis
      const architecturalDebt = this.analyzeArchitecturalDebt(content, filePath, lines);
      debtItems.push(...architecturalDebt);

      // Verification Gap Analysis
      const verificationDebt = this.analyzeVerificationGaps(content, filePath, lines);
      debtItems.push(...verificationDebt);

      // AI Pattern Detection
      const detectedPatterns = this.detectAIPatterns(content, filePath);
      aiPatterns.push(...detectedPatterns);

    } catch (error) {
      console.warn(`⚠️  Could not analyze ${filePath}: ${error}`);
    }

    return { debtItems, aiPatterns };
  }

  private analyzeComprehensionDebt(content: string, filePath: string, lines: string[]): DebtItem[] {
    const items: DebtItem[] = [];
    
    // Magic numbers
    const magicNumbers = content.match(AI_PATTERNS.magicNumbers) || [];
    magicNumbers.forEach((match, index) => {
      const lineNum = content.substring(0, content.indexOf(match)).split('\n').length;
      items.push({
        file: filePath,
        line: lineNum,
        message: `Magic number detected: ${match}. Consider using named constants.`,
        severity: DebtSeverity.MEDIUM,
        category: 'comprehension',
        aiConfidence: 0.8,
        fixSuggestions: ['Replace with a meaningful constant', 'Add comment explaining the number']
      });
    });

    // Generic names
    const genericNames = content.match(AI_PATTERNS.genericNames) || [];
    genericNames.forEach((match, index) => {
      const lineNum = content.substring(0, content.indexOf(match)).split('\n').length;
      items.push({
        file: filePath,
        line: lineNum,
        message: `Generic variable name '${match}'. Use descriptive names.`,
        severity: DebtSeverity.LOW,
        category: 'comprehension',
        aiConfidence: 0.6,
        fixSuggestions: ['Rename to be more descriptive', 'Add comment explaining purpose']
      });
    });

    // Vague comments
    const vagueComments = content.match(AI_PATTERNS.vagueComments) || [];
    vagueComments.forEach((match, index) => {
      const lineNum = content.substring(0, content.indexOf(match)).split('\n').length;
      items.push({
        file: filePath,
        line: lineNum,
        message: `Vague or incomplete comment: ${match}`,
        severity: DebtSeverity.LOW,
        category: 'comprehension',
        aiConfidence: 0.5,
        fixSuggestions: ['Remove or improve the comment', 'Add specific details']
      });
    });

    // Hardcoded values
    const hardcodedValues = content.match(AI_PATTERNS.hardcodedValues) || [];
    hardcodedValues.forEach((match, index) => {
      const lineNum = content.substring(0, content.indexOf(match)).split('\n').length;
      items.push({
        file: filePath,
        line: lineNum,
        message: `Hardcoded value detected: ${match}. Consider configuration or constants.`,
        severity: DebtSeverity.HIGH,
        category: 'comprehension',
        aiConfidence: 0.9,
        fixSuggestions: ['Move to configuration file', 'Use environment variables', 'Create constants']
      });
    });

    return items;
  }

  private analyzeArchitecturalDebt(content: string, filePath: string, lines: string[]): DebtItem[] {
    const items: DebtItem[] = [];

    // Deep nesting
    const deepNesting = content.match(AI_PATTERNS.deepNesting) || [];
    deepNesting.forEach((match, index) => {
      const lineNum = content.substring(0, content.indexOf(match)).split('\n').length;
      items.push({
        file: filePath,
        line: lineNum,
        message: 'Deep nesting detected. Consider refactoring to reduce complexity.',
        severity: DebtSeverity.MEDIUM,
        category: 'architectural',
        aiConfidence: 0.7,
        fixSuggestions: ['Extract to helper method', 'Use guard clauses', 'Early returns']
      });
    });

    // Excessive parameters
    const excessiveParams = content.match(AI_PATTERNS.excessiveParams) || [];
    excessiveParams.forEach((match, index) => {
      const lineNum = content.substring(0, content.indexOf(match)).split('\n').length;
      items.push({
        file: filePath,
        line: lineNum,
        message: 'Function has too many parameters. Consider using objects or configuration.',
        severity: DebtSeverity.HIGH,
        category: 'architectural',
        aiConfidence: 0.8,
        fixSuggestions: ['Group parameters into objects', 'Use builder pattern', 'Reduce parameter count']
      });
    });

    // SOLID violations
    Object.entries(SOLID_VIOLATIONS).forEach(([principle, config]) => {
      const pattern = config.patterns[0];
      if (!pattern) return;
      const violations = content.match(pattern) || [];
      const violationCount = violations.length;
      if (violationCount / lines.length > config.threshold) {
        items.push({
          file: filePath,
          line: 1,
          message: `Potential ${principle} violation detected. Consider refactoring.`,
          severity: DebtSeverity.MEDIUM,
          category: 'architectural',
          aiConfidence: 0.6,
          fixSuggestions: [`${principle} refactoring suggestions would go here`]
        });
      }
    });

    return items;
  }

  private analyzeVerificationGaps(content: string, filePath: string, lines: string[]): DebtItem[] {
    const items: DebtItem[] = [];

    // Look for AI-generated test patterns
    const testFiles = content.match(/test\.spec\.ts|test\.ts|\.test\.ts/i);
    if (!testFiles && (filePath.includes('src') || filePath.includes('lib'))) {
      items.push({
        file: filePath,
        line: 1,
        message: 'No corresponding test file found for this module.',
        severity: DebtSeverity.HIGH,
        category: 'verification',
        aiConfidence: 0.5,
        fixSuggestions: ['Create comprehensive tests', 'Add unit tests for edge cases']
      });
    }

    // Look for hardcoded test values
    const testHardcoded = content.match(/describe\([^)]*\)\s*{[^}]*\b\d+\b[^}]*}/g);
    testHardcoded?.forEach((match, index) => {
      const lineNum = content.substring(0, content.indexOf(match)).split('\n').length;
      items.push({
        file: filePath,
        line: lineNum,
        message: 'Hardcoded test values detected. Use test data factories.',
        severity: DebtSeverity.LOW,
        category: 'verification',
        aiConfidence: 0.6,
        fixSuggestions: ['Create test data factories', 'Use dynamic test data']
      });
    });

    return items;
  }

  private detectAIPatterns(content: string, filePath: string): AIAttributionPattern[] {
    const patterns: AIAttributionPattern[] = [];

    // Long method chains
    const longChains = content.match(AI_PATTERNS.longChains) || [];
    if (longChains.length > 0) {
      patterns.push({
        pattern: 'longChains',
        confidence: 0.8,
        frequency: longChains.length,
        examples: longChains.slice(0, 3)
      });
    }

    // Excessive async methods
    const asyncMethods = content.match(AI_PATTERNS.excessiveMethods) || [];
    if (asyncMethods.length > 0) {
      patterns.push({
        pattern: 'excessiveAsyncMethods',
        confidence: 0.7,
        frequency: asyncMethods.length,
        examples: asyncMethods.slice(0, 2)
      });
    }

    // Excessive imports
    const excessiveImports = content.match(AI_PATTERNS.excessiveImports) || [];
    if (excessiveImports.length > 3) {
      patterns.push({
        pattern: 'excessiveImports',
        confidence: 0.6,
        frequency: excessiveImports.length,
        examples: excessiveImports.slice(0, 3)
      });
    }

    return patterns;
  }

  private generateReport(debtItems: DebtItem[], aiPatterns: AIAttributionPattern[], duration: number): DebtReport {
    const debtTypes = this.groupDebtByType(debtItems);
    const overallScore = this.calculateOverallScore(debtTypes);
    const severity = this.calculateSeverity(overallScore);
    const estimatedCost = this.estimateDebtCost(debtItems);

    const metrics = {
      architectural: {
        coupling: this.calculateCoupling(debtItems),
        cohesion: this.calculateCohesion(debtItems),
        complexity: this.calculateComplexity(debtItems),
        maintainability: this.calculateMaintainability(debtItems)
      },
      comprehension: {
        clarity: this.calculateClarity(debtItems),
        readability: this.calculateReadability(debtItems),
        documentation: this.calculateDocumentation(debtItems),
        overall: this.calculateComprehensionScore(debtItems)
      },
      verification: {
        testCoverage: this.calculateTestCoverage(debtItems),
        testEffectiveness: this.calculateTestEffectiveness(debtItems),
        brittleness: this.calculateBrittleness(debtItems),
        overall: this.calculateVerificationScore(debtItems)
      }
    };

    return {
      overallScore,
      severity,
      totalDebtItems: debtItems.length,
      estimatedCost,
      affectedFiles: new Set(debtItems.map(item => item.file)).size,
      debtTypes,
      metrics,
      recommendations: this.generateRecommendations(debtTypes, metrics),
      timestamp: new Date().toISOString()
    };
  }

  private groupDebtByType(items: DebtItem[]): DebtType[] {
    const grouped = items.reduce((acc, item) => {
      const key = item.category;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key]!.push(item);
      return acc;
    }, {} as Record<string, DebtItem[]>);

    return Object.entries(grouped).map(([name, groupedItems]) => ({
      name,
      count: groupedItems.length,
      items: groupedItems,
      score: this.calculateTypeScore(groupedItems)
    }));
  }

  private calculateOverallScore(debtTypes: DebtType[]): number {
    const totalItems = debtTypes.reduce((sum, type) => sum + type.count, 0);
    const weights = {
      comprehension: 0.3,
      architectural: 0.4,
      verification: 0.3
    };

    const weightedScores = debtTypes.map(type => {
      let weight = 0.3;
      if (type.name === 'architectural') weight = 0.4;
      if (type.name === 'verification') weight = 0.3;
      
      return (type.count / totalItems) * weight * 100;
    });

    return Math.max(0, 100 - weightedScores.reduce((sum, score) => sum + score, 0));
  }

  private calculateSeverity(score: number): DebtSeverity {
    if (score >= 80) return DebtSeverity.LOW;
    if (score >= 60) return DebtSeverity.MEDIUM;
    if (score >= 40) return DebtSeverity.HIGH;
    return DebtSeverity.CRITICAL;
  }

  private estimateDebtCost(items: DebtItem[]): number {
    const costPerItem = 500; // Average cost per technical debt item in USD
    return items.reduce((sum, item) => {
      const severityMultiplier = {
        [DebtSeverity.CRITICAL]: 3,
        [DebtSeverity.HIGH]: 2,
        [DebtSeverity.MEDIUM]: 1.5,
        [DebtSeverity.LOW]: 1
      };
      return sum + (costPerItem * severityMultiplier[item.severity]);
    }, 0);
  }

  private calculateCoupling(items: DebtItem[]): number {
    const couplingItems = items.filter(item => item.category === 'architectural');
    return couplingItems.length > 0 ? couplingItems.length / 10 : 0.1;
  }

  private calculateCohesion(items: DebtItem[]): number {
    return 1 - this.calculateCoupling(items);
  }

  private calculateComplexity(items: DebtItem[]): number {
    const complexityItems = items.filter(item => item.category === 'comprehension');
    return complexityItems.length > 0 ? complexityItems.length / 20 : 0.1;
  }

  private calculateMaintainability(items: DebtItem[]): number {
    return Math.max(0, 1 - (items.length / 100));
  }

  private calculateClarity(items: DebtItem[]): number {
    const clarityItems = items.filter(item => item.category === 'comprehension');
    return Math.max(0, 1 - (clarityItems.length / 50));
  }

  private calculateReadability(items: DebtItem[]): number {
    return this.calculateClarity(items);
  }

  private calculateDocumentation(items: DebtItem[]): number {
    const docItems = items.filter(item => item.message.includes('comment'));
    return Math.max(0, 1 - (docItems.length / 30));
  }

  private calculateComprehensionScore(items: DebtItem[]): number {
    const weights = {
      clarity: 0.4,
      readability: 0.3,
      documentation: 0.3
    };
    return this.calculateClarity(items) * weights.clarity +
           this.calculateReadability(items) * weights.readability +
           this.calculateDocumentation(items) * weights.documentation;
  }

  private calculateTestCoverage(items: DebtItem[]): number {
    const testItems = items.filter(item => item.category === 'verification');
    return Math.max(0, 1 - (testItems.length / 20));
  }

  private calculateTestEffectiveness(items: DebtItem[]): number {
    return this.calculateTestCoverage(items) * 0.8;
  }

  private calculateBrittleness(items: DebtItem[]): number {
    const brittleItems = items.filter(item => item.message.includes('hardcoded'));
    return brittleItems.length > 0 ? brittleItems.length / 10 : 0.1;
  }

  private calculateVerificationScore(items: DebtItem[]): number {
    const weights = {
      testCoverage: 0.5,
      testEffectiveness: 0.3,
      brittleness: 0.2
    };
    return this.calculateTestCoverage(items) * weights.testCoverage +
           this.calculateTestEffectiveness(items) * weights.testEffectiveness +
           (1 - this.calculateBrittleness(items)) * weights.brittleness;
  }

  private calculateTypeScore(items: DebtItem[]): number {
    if (items.length === 0) return 100;
    
    const avgSeverity = items.reduce((sum, item) => {
      const severityValue = {
        [DebtSeverity.CRITICAL]: 3,
        [DebtSeverity.HIGH]: 2,
        [DebtSeverity.MEDIUM]: 1,
        [DebtSeverity.LOW]: 0
      };
      return sum + severityValue[item.severity];
    }, 0) / items.length;

    return Math.max(0, 100 - (avgSeverity * 25));
  }

  private generateAIAttribution(patterns: AIAttributionPattern[]): AIAttribution {
    const primaryTools = this.identifyPrimaryTools(patterns);
    const confidence = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length || 0;

    return {
      patterns,
      confidence,
      primaryTools
    };
  }

  private identifyPrimaryTools(patterns: AIAttributionPattern[]): string[] {
    const toolMap: Record<string, number> = {
      'GitHub Copilot': 0,
      'ChatGPT': 0,
      'Claude': 0,
      'Cursor': 0,
      'Tabnine': 0
    };

    patterns.forEach(pattern => {
      if (pattern.pattern.includes('longChains')) toolMap['GitHub Copilot']! += 0.3;
      if (pattern.pattern.includes('excessiveAsync')) toolMap['ChatGPT']! += 0.2;
      if (pattern.pattern.includes('excessiveImports')) toolMap['Claude']! += 0.25;
      if (pattern.pattern.includes('hardcoded')) toolMap['Cursor']! += 0.25;
    });

    return Object.entries(toolMap)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .filter(([, score]) => score > 0.1)
      .map(([tool]) => tool);
  }

  private generateRecommendations(debtTypes: DebtType[], metrics: any): string[] {
    const recommendations: string[] = [];

    if (metrics.architectural.coupling > 0.6) {
      recommendations.push('Refactor high-coupled modules. Consider dependency injection and interfaces.');
    }

    if (metrics.comprehension.clarity < 0.7) {
      recommendations.push('Improve code clarity. Add meaningful variable names and comprehensive documentation.');
    }

    if (metrics.verification.testCoverage < 0.8) {
      recommendations.push('Increase test coverage. Create comprehensive tests for AI-generated code.');
    }

    if (debtTypes.some(type => type.name === 'comprehension' && type.score < 70)) {
      recommendations.push('Review AI-generated code for comprehension issues. Focus on readability and maintainability.');
    }

    if (debtTypes.some(type => type.name === 'architectural' && type.score < 70)) {
      recommendations.push('Address architectural violations. Consider refactoring to align with SOLID principles.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Code quality is good. Consider implementing CI/CD checks for technical debt prevention.');
    }

    return recommendations;
  }

  private getAllFiles(paths: string[]): string[] {
    const files: string[] = [];
    
    for (const path of paths) {
      if (!existsSync(path)) continue;
      
      const stat = statSync(path);
      if (stat.isFile() && (path.endsWith('.ts') || path.endsWith('.js') || path.endsWith('.tsx') || path.endsWith('.jsx'))) {
        files.push(path);
      } else if (stat.isDirectory()) {
        this.readdirRecursive(path, files);
      }
    }
    
    return files;
  }

  private readdirRecursive(dir: string, files: string[]): void {
    const items = readdirSync(dir);
    
    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);
      
      if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.js') || item.endsWith('.tsx') || item.endsWith('.jsx'))) {
        files.push(fullPath);
      } else if (stat.isDirectory()) {
        this.readdirRecursive(fullPath, files);
      }
    }
  }

  async scanAndPrevent(): Promise<DebtReport> {
    // This would integrate with development environments to prevent debt in real-time
    // For now, it's a placeholder for future real-time prevention functionality
    return {
      overallScore: 85,
      severity: DebtSeverity.LOW,
      totalDebtItems: 0,
      estimatedCost: 0,
      affectedFiles: 0,
      debtTypes: [],
      metrics: {
        architectural: {
          coupling: 0.2,
          cohesion: 0.8,
          complexity: 0.3,
          maintainability: 0.9
        },
        comprehension: {
          clarity: 0.8,
          readability: 0.8,
          documentation: 0.7,
          overall: 0.77
        },
        verification: {
          testCoverage: 0.9,
          testEffectiveness: 0.8,
          brittleness: 0.1,
          overall: 0.85
        }
      },
      recommendations: ['No technical debt detected. Code quality is good.'],
      timestamp: new Date().toISOString()
    };
  }
}