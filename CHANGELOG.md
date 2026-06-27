# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2026-06-27

### Added
- 10 new tests (67 total, up from 57): CLI integration tests covering main(), scanAndPrevent, output format verification
- Severity emoji coverage test for all 4 severity levels
- Excluded sample.ts fixture from coverage reporting

### Changed
- Rewrote README hook: "AI ships code fast. This tool catches the debt it leaves behind."
- Coverage now at 86.47% statements (up from 83.94%), 97.77% functions
- Clean ESLint pass (0 warnings)

### Fixed
- sample.ts was incorrectly counted in coverage, dragging overall stats down

## [Unreleased]

### Added
- ESLint flat config with typescript-eslint v8 for strict type checking
- Test coverage reporting with c8 (@vitest/coverage-v8)
- 40+ new tests:
  - 24 CLI tests covering argument parsing, help/version, config loading
  - 17 analyzer tests covering all analysis modes and edge cases
  - 9 index tests covering exports and report generation
- `AnalyzerConfig` interface for strongly-typed analyzer initialization

### Changed
- Improved type safety by replacing all `any` types with proper TypeScript interfaces
- Refactored `TechnicalDebtAnalyzer` constructor to use typed `AnalyzerConfig` interface
- Updated `PreventionGuardrail` rule signature to use `Record<string, unknown>` instead of `any`
- Fixed `generateRecommendations` signature to use typed metrics interface

### Fixed
- Removed unused imports and parameters to satisfy strict TypeScript mode
- Fixed missing `afterEach` import in test file
- Added null checks for CLI argument parsing in strict mode
- Improved `loadConfig` function return type from `any` to `Record<string, unknown>`

### Security
- Eliminated all `any` types to improve type safety and prevent runtime type coercion

## [1.0.1] - 2026-06-27

### Fixed
- Fixed BROKEN build by adding all missing devDependencies
- Fixed 14 TypeScript strict mode errors (noUncheckedIndexedAccess, isolatedModules, etc.)
- Fixed CLI argument parsing for undefined process.argv values
- Fixed environment variable access with bracket notation for strict mode
- Added test:coverage script to package.json

### Changed
- Created CHANGELOG.md with v1.0.0 history
- Bumped version to 1.0.1

## [1.0.0] - 2026-06-26

### Added
- Initial release of AI Technical Debt CLI
- Three analysis modes: comprehension, architectural, verification
- AI attribution detection with pattern matching
- CLI tool with multiple output formats (console, markdown, JSON)
- Prevention mode for real-time technical debt prevention
- Technical debt quantification with cost estimation
- Configuration file support (ai-debt.config.json)
- 7 basic integration tests