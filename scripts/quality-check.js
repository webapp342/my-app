#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class QualityChecker {
  constructor() {
    this.maxRetries = 5;
    this.retryDelay = 2000;
    this.errors = [];
    this.warnings = [];
    this.fixes = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix =
      type === 'error'
        ? '❌'
        : type === 'warning'
          ? '⚠️'
          : type === 'success'
            ? '✅'
            : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runCommand(command, description) {
    return new Promise((resolve, reject) => {
      this.log(`Running: ${description}`);

      const child = spawn(command.split(' ')[0], command.split(' ').slice(1), {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
        cwd: process.cwd(),
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', data => {
        stdout += data.toString();
      });

      child.stderr.on('data', data => {
        stderr += data.toString();
      });

      child.on('close', code => {
        if (code === 0) {
          this.log(`${description} completed successfully`, 'success');
          resolve({ success: true, stdout, stderr });
        } else {
          this.log(`${description} failed with code ${code}`, 'error');
          this.errors.push({ command, description, code, stdout, stderr });
          resolve({ success: false, stdout, stderr, code });
        }
      });

      child.on('error', error => {
        this.log(`${description} error: ${error.message}`, 'error');
        reject(error);
      });
    });
  }

  async runTypeScriptCheck() {
    return this.runCommand('npx tsc --noEmit', 'TypeScript type checking');
  }

  async runLintCheck() {
    return this.runCommand('npm run lint', 'ESLint code quality check');
  }

  async runPrettierCheck() {
    return this.runCommand(
      'npx prettier --check .',
      'Prettier formatting check'
    );
  }

  async runPrettierFix() {
    return this.runCommand('npx prettier --write .', 'Prettier auto-fix');
  }

  async runESLintFix() {
    return this.runCommand('npx eslint --fix .', 'ESLint auto-fix');
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async autoFix() {
    this.log('Attempting automatic fixes...', 'info');

    // Run Prettier fix
    const prettierResult = await this.runPrettierFix();
    if (prettierResult.success) {
      this.fixes.push('Prettier formatting fixed');
    }

    // Run ESLint fix
    const eslintResult = await this.runESLintFix();
    if (eslintResult.success) {
      this.fixes.push('ESLint issues auto-fixed');
    }

    return prettierResult.success || eslintResult.success;
  }

  generateSummary() {
    const summary = {
      timestamp: new Date().toISOString(),
      totalErrors: this.errors.length,
      totalWarnings: this.warnings.length,
      totalFixes: this.fixes.length,
      errors: this.errors,
      warnings: this.warnings,
      fixes: this.fixes,
    };

    return summary;
  }

  async runQualityCheck() {
    this.log('🚀 Starting automated quality check...', 'info');

    let attempt = 1;
    let allPassed = false;

    while (attempt <= this.maxRetries && !allPassed) {
      this.log(
        `\n📋 Quality Check Attempt ${attempt}/${this.maxRetries}`,
        'info'
      );

      // Reset errors for this attempt
      this.errors = [];
      this.warnings = [];
      this.fixes = [];

      // Run all checks
      const [tsResult, lintResult, prettierResult] = await Promise.all([
        this.runTypeScriptCheck(),
        this.runLintCheck(),
        this.runPrettierCheck(),
      ]);

      // Check if all passed
      allPassed =
        tsResult.success && lintResult.success && prettierResult.success;

      if (!allPassed) {
        this.log(`\n⚠️  Quality check failed on attempt ${attempt}`, 'warning');

        // Try auto-fix on first attempt
        if (attempt === 1) {
          this.log('🔧 Attempting automatic fixes...', 'info');
          const fixResult = await this.autoFix();

          if (fixResult) {
            this.log('✅ Auto-fixes applied, retrying checks...', 'success');
            await this.sleep(this.retryDelay);
            continue;
          }
        }

        // Show detailed errors
        this.errors.forEach(error => {
          this.log(`\n❌ ${error.description}:`, 'error');
          if (error.stderr) {
            console.log(error.stderr);
          }
        });

        if (attempt < this.maxRetries) {
          this.log(`\n⏳ Waiting ${this.retryDelay}ms before retry...`, 'info');
          await this.sleep(this.retryDelay);
        }
      } else {
        this.log('\n🎉 All quality checks passed!', 'success');
      }

      attempt++;
    }

    // Generate final summary
    const summary = this.generateSummary();

    this.log('\n📊 Quality Check Summary:', 'info');
    this.log(
      `Total Errors: ${summary.totalErrors}`,
      summary.totalErrors > 0 ? 'error' : 'success'
    );
    this.log(
      `Total Warnings: ${summary.totalWarnings}`,
      summary.totalWarnings > 0 ? 'warning' : 'success'
    );
    this.log(`Auto-fixes Applied: ${summary.totalFixes}`, 'info');

    if (summary.fixes.length > 0) {
      this.log('\n🔧 Applied Fixes:', 'info');
      summary.fixes.forEach(fix => this.log(`  - ${fix}`, 'success'));
    }

    // Save summary to file
    const summaryPath = path.join(
      process.cwd(),
      '.cursor-quality-summary.json'
    );
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    this.log(`\n📄 Summary saved to: ${summaryPath}`, 'info');

    return {
      success: allPassed,
      summary,
      attempts: attempt - 1,
    };
  }
}

// Run quality check if this script is executed directly
if (require.main === module) {
  const checker = new QualityChecker();
  checker
    .runQualityCheck()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Quality check failed:', error);
      process.exit(1);
    });
}

module.exports = QualityChecker;
