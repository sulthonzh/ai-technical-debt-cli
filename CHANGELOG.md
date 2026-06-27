# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-06-27

### Fixed
- Added missing devDependencies (vitest, tsup, typescript, tsx, @vitest/coverage-v8)
- Fixed 14 TypeScript strict mode errors (noUncheckedIndexedAccess, isolatedModules)
- Fixed type exports for AnalysisMode and DebtType (were value exports, needed `export type`)
- Fixed CLI arg parsing for undefined values (process.argv access)
- Fixed reduce accumulator typing in groupDebtByType

### Added
- Test coverage reporting via @vitest/coverage-v8
- `test:coverage` script in package.json
- This CHANGELOG.md

## [1.0.0] - Initial Release

### Added
- AI-generated technical debt detection (comprehension, architectural, verification)
- AI tool attribution analysis (Copilot, ChatGPT, Claude, Cursor patterns)
- SOLID violation detection
- Three output formats: console, JSON, markdown
- CLI with configurable thresholds and analysis modes
- Real-time prevention mode (scanAndPrevent)
