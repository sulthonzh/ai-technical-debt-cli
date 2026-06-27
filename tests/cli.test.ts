import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseCLIArgs, showHelp, showVersion, loadConfig } from '../src/cli';
import { writeFileSync, existsSync, rmSync } from 'fs';
import { join } from 'path';

describe('CLI parseCLIArgs', () => {
  it('should parse --help flag', () => {
    const result = parseCLIArgs(['--help']);
    expect(result.help).toBe(true);
  });

  it('should parse -h flag', () => {
    const result = parseCLIArgs(['-h']);
    expect(result.help).toBe(true);
  });

  it('should parse --version flag', () => {
    const result = parseCLIArgs(['--version']);
    expect(result.version).toBe(true);
  });

  it('should parse -v flag', () => {
    const result = parseCLIArgs(['-v']);
    expect(result.version).toBe(true);
  });

  it('should parse --verbose flag', () => {
    const result = parseCLIArgs(['--verbose']);
    expect(result.verbose).toBe(true);
  });

  it('should parse -V flag', () => {
    const result = parseCLIArgs(['-V']);
    expect(result.verbose).toBe(true);
  });

  it('should parse --prevention flag', () => {
    const result = parseCLIArgs(['--prevention']);
    expect(result.prevention).toBe(true);
  });

  it('should parse --attribution flag', () => {
    const result = parseCLIArgs(['--attribution']);
    expect(result.attribution).toBe(true);
  });

  it('should parse --output with valid format', () => {
    const result = parseCLIArgs(['--output', 'json']);
    expect(result.output).toBe('json');
  });

  it('should parse --output markdown', () => {
    const result = parseCLIArgs(['--output', 'markdown']);
    expect(result.output).toBe('markdown');
  });

  it('should ignore invalid --output format', () => {
    const result = parseCLIArgs(['--output', 'xml']);
    expect(result.output).toBeUndefined();
  });

  it('should parse --mode with valid modes', () => {
    const result = parseCLIArgs(['--mode', 'comprehension,architectural']);
    expect(result.mode).toEqual(['comprehension', 'architectural']);
  });

  it('should filter invalid modes from --mode', () => {
    const result = parseCLIArgs(['--mode', 'comprehension,invalid,verification']);
    expect(result.mode).toEqual(['comprehension', 'verification']);
  });

  it('should parse --config with path', () => {
    const result = parseCLIArgs(['--config', '/path/to/config.json']);
    expect(result.config).toBe('/path/to/config.json');
  });

  it('should parse --threshold with value', () => {
    const result = parseCLIArgs(['--threshold', '0.5']);
    expect(result.threshold).toBe('0.5');
  });

  it('should parse positional paths', () => {
    const result = parseCLIArgs(['src/', 'lib/']);
    expect(result.paths).toEqual(['src/', 'lib/']);
  });

  it('should handle mixed flags and paths', () => {
    const result = parseCLIArgs(['src/', '--verbose', 'lib/', '--output', 'json']);
    expect(result.paths).toEqual(['src/', 'lib/']);
    expect(result.verbose).toBe(true);
    expect(result.output).toBe('json');
  });

  it('should handle empty args', () => {
    const result = parseCLIArgs([]);
    expect(result.help).toBeUndefined();
    expect(result.version).toBeUndefined();
    expect(result.paths).toBeUndefined();
  });
});

describe('CLI showHelp', () => {
  it('should output help text to console', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    showHelp();
    expect(logSpy).toHaveBeenCalled();
    const output = logSpy.mock.calls[0]?.[0] ?? '';
    expect(output).toContain('AI Technical Debt CLI');
    expect(output).toContain('Usage:');
    expect(output).toContain('--help');
    expect(output).toContain('--version');
    expect(output).toContain('--mode');
    expect(output).toContain('--output');
    logSpy.mockRestore();
  });
});

describe('CLI showVersion', () => {
  it('should output version information', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    showVersion();
    expect(logSpy).toHaveBeenCalled();
    const output = logSpy.mock.calls[0]?.[0] ?? '';
    expect(output).toContain('AI Technical Debt CLI v');
    logSpy.mockRestore();
  });
});

describe('CLI loadConfig', () => {
  const testConfigPath = join(process.cwd(), 'test-config-temp.json');

  afterEach(() => {
    if (existsSync(testConfigPath)) {
      rmSync(testConfigPath);
    }
  });

  it('should return empty object when config file does not exist', () => {
    const result = loadConfig('/nonexistent/path/config.json');
    expect(result).toEqual({});
  });

  it('should load and parse valid JSON config', () => {
    const config = {
      rootDir: './src',
      thresholds: { complexity: 0.8 }
    };
    writeFileSync(testConfigPath, JSON.stringify(config));
    
    const result = loadConfig(testConfigPath);
    expect(result.rootDir).toBe('./src');
    expect(result.thresholds.complexity).toBe(0.8);
  });

  it('should handle malformed JSON gracefully', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    writeFileSync(testConfigPath, '{ invalid json }');
    
    const result = loadConfig(testConfigPath);
    expect(result).toEqual({});
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('should use AI_DEBT_CONFIG_PATH env var when no path provided', () => {
    vi.stubEnv('AI_DEBT_CONFIG_PATH', testConfigPath);
    const config = { rootDir: './env-test' };
    writeFileSync(testConfigPath, JSON.stringify(config));
    
    const result = loadConfig(undefined);
    expect(result.rootDir).toBe('./env-test');
    vi.unstubAllEnvs();
  });
});
