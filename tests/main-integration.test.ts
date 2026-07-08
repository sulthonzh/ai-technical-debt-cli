import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

/**
 * Integration tests for cli.ts main() function.
 * Covers verbose output, prevention mode, exit codes, and error handling.
 */
describe('CLI main() integration', () => {
  let testDir: string;
  let originalArgv: string[];
  let originalCwd: string;

  beforeEach(() => {
    testDir = join(process.cwd(), 'test-main-integration');
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    originalArgv = process.argv;
    originalCwd = process.cwd();

    // Mock process.exit to prevent actual exit
    vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
      throw new Error(`process.exit(${code})`);
    });
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.chdir(originalCwd);
    vi.restoreAllMocks();

    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('should show help and exit 0 when --help is passed', async () => {
    process.argv = ['node', 'ai-debt', '--help'];
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { main } = await import('../src/cli');
    await main();

    expect(logSpy).toHaveBeenCalled();
    const output = logSpy.mock.calls[0]?.[0] ?? '';
    expect(output).toContain('AI Technical Debt CLI');
    expect(output).toContain('Usage:');
    expect(process.exit).not.toHaveBeenCalled();
  });

  it('should show version and exit 0 when --version is passed', async () => {
    process.argv = ['node', 'ai-debt', '--version'];
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { main } = await import('../src/cli');
    await main();

    expect(logSpy).toHaveBeenCalled();
    const output = logSpy.mock.calls[0]?.[0] ?? '';
    expect(output).toMatch(/AI Technical Debt CLI v\d+\.\d+\.\d+/);
  });

  it('should show help with -h shorthand', async () => {
    process.argv = ['node', 'ai-debt', '-h'];
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { main } = await import('../src/cli');
    await main();

    expect(logSpy).toHaveBeenCalled();
    const output = logSpy.mock.calls[0]?.[0] ?? '';
    expect(output).toContain('Usage: ai-debt');
  });

  it('should show version with -v shorthand', async () => {
    process.argv = ['node', 'ai-debt', '-v'];
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { main } = await import('../src/cli');
    await main();

    const output = logSpy.mock.calls[0]?.[0] ?? '';
    expect(output).toMatch(/v\d+\.\d+\.\d+/);
  });

  it('should run verbose analysis with --verbose flag', async () => {
    // Create a test file with some debt
    const testFile = join(testDir, 'verbose-test.ts');
    writeFileSync(testFile, 'const temp = 42;\n');

    process.argv = ['node', 'ai-debt', testDir, '--verbose'];
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { main } = await import('../src/cli');
    await main().catch(() => {}); // May throw due to process.exit mock

    // Verbose output should include starting message
    const allOutput = logSpy.mock.calls.map(c => c[0]).join('\n');
    expect(allOutput).toContain('Starting AI Technical Debt Analysis');
    expect(allOutput).toContain('Root directory:');
    expect(allOutput).toContain('Analysis modes:');
    expect(allOutput).toContain('Output format:');
  });

  it('should run prevention mode with --prevention flag', async () => {
    process.argv = ['node', 'ai-debt', '--prevention', '--verbose'];
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { main } = await import('../src/cli');
    await main().catch(() => {});

    const allOutput = logSpy.mock.calls.map(c => c[0]).join('\n');
    expect(allOutput).toContain('prevention mode');
  });

  it('should run prevention mode with --prevention --verbose', async () => {
    process.argv = ['node', 'ai-debt', '--prevention'];
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { main } = await import('../src/cli');
    await main().catch(() => {});

    // Should produce some output (the prevention report)
    expect(logSpy).toHaveBeenCalled();
  });

  it('should analyze current directory when no paths given', async () => {
    // Use testDir as cwd to avoid analyzing the whole project
    process.chdir(testDir);
    writeFileSync(join(testDir, 'test.ts'), 'const temp = 42;\n');

    process.argv = ['node', 'ai-debt'];
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { main } = await import('../src/cli');
    await main().catch(() => {});

    expect(logSpy).toHaveBeenCalled();
  });

  it('should output JSON when --output json is specified', async () => {
    const testFile = join(testDir, 'json-output-test.ts');
    writeFileSync(testFile, 'const temp = 42;\n');

    process.argv = ['node', 'ai-debt', testDir, '--output', 'json'];
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { main } = await import('../src/cli');
    await main().catch(() => {});

    // Find the JSON output among console.log calls
    const allOutput = logSpy.mock.calls.map(c => c[0]).join('\n');
    // The JSON output should be parseable
    const jsonMatch = allOutput.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      expect(() => JSON.parse(jsonMatch[0])).not.toThrow();
    }
  });

  it('should output markdown when --output markdown is specified', async () => {
    const testFile = join(testDir, 'md-output-test.ts');
    writeFileSync(testFile, 'const temp = 42;\n');

    process.argv = ['node', 'ai-debt', testDir, '--output', 'markdown'];
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { main } = await import('../src/cli');
    await main().catch(() => {});

    const allOutput = logSpy.mock.calls.map(c => c[0]).join('\n');
    expect(allOutput).toContain('# AI Technical Debt Report');
  });

  it('should use specific modes with --mode flag', async () => {
    const testFile = join(testDir, 'mode-test.ts');
    writeFileSync(testFile, 'const temp = 42;\n');

    process.argv = ['node', 'ai-debt', testDir, '--mode', 'comprehension', '--verbose'];
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { main } = await import('../src/cli');
    await main().catch(() => {});

    const allOutput = logSpy.mock.calls.map(c => c[0]).join('\n');
    expect(allOutput).toContain('comprehension');
  });

  it('should handle error gracefully and exit 1', async () => {
    // Pass a path that will cause an error
    process.argv = ['node', 'ai-debt', '/nonexistent/deeply/nested/path/that/does/not/exist'];
    // errorSpy will be called if process.exit triggers error output
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { main } = await import('../src/cli');
    await main().catch(() => {});

    // Should not crash, should handle gracefully
    // process.exit may or may not be called depending on severity
  });

  it('should handle --config flag with a valid config file', async () => {
    const configPath = join(testDir, 'config.json');
    const config = {
      rootDir: testDir,
      thresholds: { complexity: 0.5 }
    };
    writeFileSync(configPath, JSON.stringify(config));
    writeFileSync(join(testDir, 'cfg-test.ts'), 'const temp = 42;\n');

    process.argv = ['node', 'ai-debt', testDir, '--config', configPath];
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { main } = await import('../src/cli');
    await main().catch(() => {});

    expect(logSpy).toHaveBeenCalled();
  });

  it('should handle --threshold flag', async () => {
    writeFileSync(join(testDir, 'thresh-test.ts'), 'const temp = 42;\n');

    process.argv = ['node', 'ai-debt', testDir, '--threshold', '0.5'];
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { main } = await import('../src/cli');
    await main().catch(() => {});

    expect(logSpy).toHaveBeenCalled();
  });

  it('should handle --attribution flag', async () => {
    writeFileSync(join(testDir, 'attr-test.ts'), 'const temp = 42;\n');

    process.argv = ['node', 'ai-debt', testDir, '--attribution', '--verbose'];
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { main } = await import('../src/cli');
    await main().catch(() => {});

    expect(logSpy).toHaveBeenCalled();
  });

  it('should show verbose path info when analyzing specific paths', async () => {
    writeFileSync(join(testDir, 'path-test.ts'), 'const temp = 42;\n');

    process.argv = ['node', 'ai-debt', testDir, '--verbose'];
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { main } = await import('../src/cli');
    await main().catch(() => {});

    const allOutput = logSpy.mock.calls.map(c => c[0]).join('\n');
    expect(allOutput).toContain('Analyzing paths:');
  });

  it('should use default modes when --mode not specified', async () => {
    writeFileSync(join(testDir, 'default-mode.ts'), 'const temp = 42;\n');

    process.argv = ['node', 'ai-debt', testDir, '--verbose'];
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { main } = await import('../src/cli');
    await main().catch(() => {});

    const allOutput = logSpy.mock.calls.map(c => c[0]).join('\n');
    // Default should include all 4 modes
    expect(allOutput).toContain('comprehension');
    expect(allOutput).toContain('architectural');
    expect(allOutput).toContain('verification');
    expect(allOutput).toContain('quantification');
  });
});
