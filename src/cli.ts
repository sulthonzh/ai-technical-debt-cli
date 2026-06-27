#!/usr/bin/env node

import { AITechnicalDebtCLI, AnalysisMode } from './index';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';

// Handle __dirname and __filename for ESM
const __filename = import.meta.url.startsWith('file://') ? new URL(import.meta.url).pathname : process.argv[1] ?? '';
const __dirname = dirname(__filename);

interface CLIOptions {
  paths?: string[];
  mode?: AnalysisMode[];
  output?: 'json' | 'console' | 'markdown';
  config?: string;
  verbose?: boolean;
  prevention?: boolean;
  attribution?: boolean;
  threshold?: string;
  help?: boolean;
  version?: boolean;
}

function parseCLIArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--version':
      case '-v':
        options.version = true;
        break;
      case '--verbose':
      case '-V':
        options.verbose = true;
        break;
      case '--prevention':
        options.prevention = true;
        break;
      case '--attribution':
        options.attribution = true;
        break;
      case '--output':
        if (i + 1 < args.length) {
          const value = args[i + 1];
          if (value && ['json', 'console', 'markdown'].includes(value)) {
            options.output = value as 'json' | 'console' | 'markdown';
            i++;
          }
        }
        break;
      case '--mode':
        if (i + 1 < args.length) {
          const value = args[i + 1];
          const modes = (value ?? '').split(',').map(m => m.trim()) as AnalysisMode[];
          const validModes = ['comprehension', 'architectural', 'verification', 'quantification'];
          options.mode = modes.filter(m => validModes.includes(m));
          i++;
        }
        break;
      case '--config':
        if (i + 1 < args.length) {
          options.config = args[i + 1] ?? '';
          i++;
        }
        break;
      case '--threshold':
        if (i + 1 < args.length) {
          options.threshold = args[i + 1] ?? '';
          i++;
        }
        break;
      default:
        if (arg && !arg.startsWith('-')) {
          if (!options.paths) options.paths = [];
          options.paths.push(arg);
        }
        break;
    }
  }
  
  return options;
}

function showHelp(): void {
  console.log(`
🔍 AI Technical Debt CLI - Detect and prevent AI-generated technical debt

Usage: ai-debt [options] [paths...]

Options:
  -h, --help              Show this help message
  -v, --version           Show version information
  -V, --verbose           Enable verbose output
  --mode <modes>          Analysis modes (comma-separated): comprehension, architectural, verification, quantification
  --output <format>       Output format: json, console, markdown
  --config <file>         Configuration file path
  --prevention            Enable real-time prevention mode
  --attribution           Enable AI tool attribution
  --threshold <value>      Set severity threshold (0-1)

Examples:
  ai-debt                    # Analyze current directory
  ai-debt src/               # Analyze src directory
  ai-debt --mode comprehension,architectural --output markdown
  ai-debt --config ai-debt.config.json
  ai-debt --prevention --verbose

Environment Variables:
  AI_DEBT_CONFIG_PATH       Default config file path
  AI_DEBT_VERBOSITY         Set verbosity level

Configuration File Format:
  {
    "rootDir": "./",
    "analysisModes": ["comprehension", "architectural", "verification"],
    "attributionEnabled": true,
    "outputFormat": "console",
    "thresholds": {
      "complexity": 0.7,
      "coupling": 0.6,
      "coverage": 0.8,
      "maintainability": 0.75
    }
  }
`);
}

function showVersion(): void {
  const packageJson = JSON.parse(
    readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')
  );
  console.log(`AI Technical Debt CLI v${packageJson.version}`);
}

function loadConfig(configPath: string | undefined): any {
  if (!configPath) {
    const envConfigPath = process.env['AI_DEBT_CONFIG_PATH'];
    configPath = envConfigPath || 'ai-debt.config.json';
  }
  
  if (!existsSync(configPath)) {
    return {};
  }
  
  try {
    return JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch (error) {
    console.error(`⚠️  Error loading config file: ${error}`);
    return {};
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseCLIArgs(args);
  
  if (options.help) {
    showHelp();
    return;
  }
  
  if (options.version) {
    showVersion();
    return;
  }
  
  try {
    // Load configuration
    const config = loadConfig(options.config);
    
    // Create CLI instance
    const cli = new AITechnicalDebtCLI({
      rootDir: process.cwd(),
      analysisModes: options.mode || ['comprehension', 'architectural', 'verification', 'quantification'],
      attributionEnabled: options.attribution ?? true,
      outputFormat: options.output || 'console',
      thresholds: {
        complexity: 0.7,
        coupling: 0.6,
        coverage: 0.8,
        maintainability: 0.75,
        ...config.thresholds
      }
    });

    if (options.verbose) {
      console.log('🔍 Starting AI Technical Debt Analysis...');
      console.log(`📁 Root directory: ${process.cwd()}`);
      console.log(`🎯 Analysis modes: ${cli['config']['analysisModes'].join(', ')}`);
      console.log(`📊 Output format: ${cli['config']['outputFormat']}`);
      console.log('');
    }

    let report;
    
    if (options.prevention) {
      if (options.verbose) {
        console.log('🛡️  Running in prevention mode...');
      }
      report = await cli.scanAndPrevent();
    } else {
      const paths = options.paths || ['.'];
      if (options.verbose) {
        console.log(`📁 Analyzing paths: ${paths.join(', ')}`);
      }
      report = await cli.analyze(paths);
    }

    // Generate and display report
    const output = await cli.generateReport(report);
    console.log(output);
    
    // Exit with appropriate code
    const severityScore = {
      [report.severity]: 1
    };
    
    if (report.severity === 'critical') {
      process.exit(2); // Critical issues found
    } else if (report.severity === 'high') {
      process.exit(1); // High severity issues found
    } else {
      process.exit(0); // Success
    }
    
  } catch (error) {
    console.error(`❌ Error: ${error}`);
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Export for testing
export { parseCLIArgs, loadConfig, showHelp, showVersion };

// Run if called directly
if (import.meta.url.startsWith('file://') && new URL(import.meta.url).pathname === (process.argv[1] ?? '')) {
  main().catch(console.error);
}