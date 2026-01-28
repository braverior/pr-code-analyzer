#!/usr/bin/env node
const { Command } = require("commander");

const logger = require("../src/logger");
const PRReviewer = require("../src/PRMain");

// Set up CLI
const program = new Command();

const version = require("../package.json").version;

program
  .name("pr-reviewer")
  .description("CLI tool for automated PR reviews using LLM")
  .version(version)
  .option("-b, --branch <branch>", "branch name to review")
  .option("-l, --local", "review uncommitted local changes (git diff HEAD)")
  .option("-m, --mode <mode>", "review mode (review/description)", "review")
  .option(
    "-t, --target-branch <branch>",
    "target branch to compare against",
    "development",
  )
  .option("-o, --output <output>", "output folder", "")
  .option("-v, --verbose", "enable verbose logging")
  .option("--lang <language>", "output language (zh/en)", "zh")
  .action(async (options) => {
    try {
      // Validate: must specify either --branch or --local
      if (!options.branch && !options.local) {
        logger.error("Error: must specify either --branch or --local");
        process.exit(1);
      }

      if (options.branch && options.local) {
        logger.error("Error: --branch and --local are mutually exclusive");
        process.exit(1);
      }

      if (options.verbose) {
        logger.level = "debug";
      }

      const reviewer = new PRReviewer(options);
      await reviewer.run();
      process.exit(0);
    } catch (error) {
      logger.error("Fatal error:", error);
      process.exit(1);
    }
  });

program.parse();
