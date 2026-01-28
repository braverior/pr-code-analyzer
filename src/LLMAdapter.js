const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const os = require("os");
const { exec } = require("child_process");
const OpenAI = require("openai");
const logger = require("./logger");
const { PROMPTS } = require("../MODE_FOR_PROMPT");
const HtmlReportGenerator = require("./HtmlReportGenerator");

const LANGUAGE_INSTRUCTIONS = {
  zh: "请用中文回复。",
  en: "Please respond in English.",
};

/**
 * LLMService class for interacting with OpenAI's GPT-4o-mini model
 */
module.exports = class LLMService {
  /**
   * Initializes the LLMService with an OpenAI client
   * @param {string} apiKey - OpenAI API key
   * @throws {Error} - If API key is not provided
   */
  constructor(apiKey = process.env.OPEN_API_KEY) {
    if (!apiKey) {
      throw new Error("API key is required");
    }
    this.client = new OpenAI({ apiKey });
  }

  /**
   * Processes the changes and generates a review or brief
   * @param {string} changesFilePath - Path to the changes file
   * @param {string} mode - Review mode (default: "review")
   * @param {string} outputFolder - Output folder path
   * @param {string} language - Output language (default: "zh")
   * @param {string} format - Output format: txt/html/both (default: "txt")
   * @param {boolean} openBrowser - Auto open HTML in browser (default: false)
   * @param {object} meta - Metadata like branchName
   * @returns {Promise<string>} - Path to the output file
   * @throws {Error} - If file reading or writing fails
   */
  async processChanges(
    changesFilePath,
    mode = "review",
    outputFolder = null,
    language = "zh",
    format = "txt",
    openBrowser = false,
    meta = {},
  ) {
    try {
      // Ensure file exists and read it
      await fs
        .access(changesFilePath)
        .catch(() => fs.writeFile(changesFilePath, "", "utf-8"));

      const changes = await fs.readFile(changesFilePath, "utf-8");

      // Validate mode
      if (!PROMPTS[mode]) {
        throw new Error(`Invalid mode: ${mode}`);
      }

      // Build system prompt with language instruction
      const langInstruction = LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS.zh;
      const systemPrompt = `${PROMPTS[mode]}\n\n${langInstruction}`;

      // Get LLM response
      const response = await this.client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: changes },
        ],
      });

      const outputFolderPath = outputFolder
        ? outputFolder
        : fsSync.mkdtempSync(path.join(os.tmpdir(), "llm-"));

      const result = response.choices[0].message.content;
      console.log(`\n[${mode}] Output:\n\n\n${result}\n\n\n`);

      const outputs = [];

      // Output TXT if needed
      if (format === "txt" || format === "both") {
        const txtPath = path.join(outputFolderPath, `output_${mode}.txt`);
        await fs.writeFile(txtPath, result, "utf-8");
        outputs.push(txtPath);
        logger.info(`TXT report saved to ${txtPath}`);
      }

      // Output HTML if needed
      if (format === "html" || format === "both") {
        const generator = new HtmlReportGenerator({
          branchName: meta.branchName || "unknown",
          mode,
          version: require("../package.json").version,
        });
        const htmlPath = path.join(outputFolderPath, `output_${mode}.html`);
        await generator.saveReport(result, htmlPath);
        outputs.push(htmlPath);

        // Auto open in browser
        if (openBrowser) {
          this.openInBrowser(htmlPath);
        }
      }

      return outputs[0] || null;
    } catch (error) {
      logger.error(`Error processing changes: ${error.message}`);
      return null;
    }
  }

  /**
   * Open file in default browser (cross-platform)
   * @param {string} filePath - Path to HTML file
   */
  openInBrowser(filePath) {
    const platform = process.platform;
    let command;

    switch (platform) {
      case "darwin":
        command = `open "${filePath}"`;
        break;
      case "win32":
        command = `start "" "${filePath}"`;
        break;
      default:
        command = `xdg-open "${filePath}"`;
    }

    exec(command, (error) => {
      if (error) {
        logger.warn(`Could not open browser automatically: ${error.message}`);
        logger.info(`Please open manually: ${filePath}`);
      }
    });
  }
};
