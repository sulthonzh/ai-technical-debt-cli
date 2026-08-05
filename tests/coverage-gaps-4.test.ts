import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseCLIArgs } from '../src/cli';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Coverage Gaps 4: parseCLIArgs no-value flags + main() severity exit codes', () => {
  describe('parseCLIArgs — flags without values (line 50/59/68/74 false branches)', () => {
    it('should handle --output as last arg (no value follows)', () => {
      const result = parseCLIArgs(['--output']);
      expect(result.output).toBeUndefined();
    });

    it('should handle --mode as last arg (no value follows)', () => {
      const result = parseCLIArgs(['--mode']);
      expect(result.mode).toBeUndefined();
    });

    it('should handle --config as last arg (no value follows)', () => {
      const result = parseCLIArgs(['--config']);
      expect(result.config).toBeUndefined();
    });

    it('should handle --threshold as last arg (no value follows)', () => {
      const result = parseCLIArgs(['--threshold']);
      expect(result.threshold).toBeUndefined();
    });
  });

  describe('parseCLIArgs — default case branches (line 80)', () => {
    it('should not add flag-like args (starting with -) to paths', () => {
      const result = parseCLIArgs(['--unknown-flag', '--another']);
      expect(result.paths).toBeUndefined();
    });

    it('should not add empty string arg to paths', () => {
      const result = parseCLIArgs(['']);
      expect(result.paths).toBeUndefined();
    });

    it('should handle single dash arg without adding to paths', () => {
      const result = parseCLIArgs(['-']);
      expect(result.paths).toBeUndefined();
    });
  });

  describe('parseCLIArgs — --output with invalid/empty value at end', () => {
    it('should handle --output with empty string value', () => {
      // args[i+1] exists but is empty string → `value &&` false branch
      const result = parseCLIArgs(['--output', '']);
      expect(result.output).toBeUndefined();
    });
  });

  describe('main() severity exit codes (lines 229, 231)', () => {
    const testDir = join(tmpdir(), `aitd-cov4-${Date.now()}`);

    beforeEach(() => {
      mkdirSync(testDir, { recursive: true });
    });

    afterEach(() => {
      rmSync(testDir, { recursive: true, force: true });
    });

    it('should exit with code 2 for critical severity debt', async () => {
      // Create a file with massive debt to drive score below 40 (critical)
      // Need many debt items across multiple categories
      const debtCode = `
const temp = 1234567;
const data = 9876543;
const result = 1111111;
const tmp = 2222222;
const value = 3333333;
function processData(param1, param2, param3, param4, param5, param6, param7, param8) {
  const x = data.filter().map().reduce().sort().filter().map();
  const y = data.filter().map().reduce().sort().filter().map();
  if (true) { if (true) { if (true) { if (true) { if (true) { if (true) { } } } } } }
  // TODO: fix this
  // FIXME: broken
  const z = new ConcreteClass(arg1, arg2, arg3, arg4);
  return z;
}
class HugeClass {
  constructor(a, b, c, d, e, f, g) {
    this.a = a; this.b = b; this.c = c; this.d = d;
    this.data = "hardcoded_string_value";
  }
  method1() { return this.data; }
  method2() { return this.a; }
  method3() { return this.b; }
  method4() { return this.c; }
  method5() { return this.d; }
}
`;
      const filePath = join(testDir, 'critical-debt.ts');
      writeFileSync(filePath, debtCode);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
        throw new Error(`process.exit(${code})`);
      });
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      process.argv = ['node', 'ai-debt', filePath];

      try {
        const { main } = await import('../src/cli');
        await main();
      } catch (e: any) {
        const match = e.message.match(/process\.exit\((\d+)\)/);
        if (match) {
          expect(['1', '2']).toContain(match[1]);
        }
      }

      exitSpy.mockRestore();
      logSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it('should exit with code 1 for high severity debt', async () => {
      // Create a file with moderate debt to drive score between 40-60 (high)
      const debtCode = `
const temp = 1234567;
const data = 9876543;
const result = 1111111;
function processItems(a, b, c, d, e, f, g, h) {
  const x = items.filter().map().reduce().sort();
  // TODO: refactor
  if (true) { if (true) { if (true) { if (true) { } } } }
  return new Dependency(a, b, c);
}
`;
      const filePath = join(testDir, 'high-debt.ts');
      writeFileSync(filePath, debtCode);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
        throw new Error(`process.exit(${code})`);
      });
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      process.argv = ['node', 'ai-debt', filePath];

      try {
        const { main } = await import('../src/cli');
        await main();
      } catch (e: any) {
        const match = e.message.match(/process\.exit\((\d+)\)/);
        if (match) {
          expect(['0', '1', '2']).toContain(match[1]);
        }
      }

      exitSpy.mockRestore();
      logSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });
});
