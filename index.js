#!/usr/bin/env node

import fs from "fs";
import path from "path";
import inquirer from "inquirer";
import { fileURLToPath } from "url";
import fetch from "node-fetch";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case "init":
    initCommand();
    break;
  case "add":
    addCommand(args[1]);
    break;
  default:
    console.error("❌ Unknown command. Available:");
    console.error("   flexnative-cli init");
    console.error("   flexnative-cli add <URL>");
    process.exit(1);
}

/**
 * ------------------------------------------------------------
 * COMMAND: init
 * ------------------------------------------------------------
 * 1. Ask for tsconfig.json path
 * 2. Ensure '@/*' => e.g. './src/*'
 * 3. Ask for a theme (default/dark/light)
 * 4. Create or update flexnative.json
 * 5. Create base theme files => @/constants/colors.ts, etc.
 */
async function initCommand() {
  console.log("🔧 Running flexnative-cli init...\n");

  const { tsconfigPathInput } = await inquirer.prompt([
    {
      type: "input",
      name: "tsconfigPathInput",
      message: "Where is your tsconfig.json?",
      default: "tsconfig.json",
    },
  ]);

  const tsconfigFullPath = path.join(process.cwd(), tsconfigPathInput);
  let tsconfig = {};

  if (fs.existsSync(tsconfigFullPath)) {
    tsconfig = JSON.parse(fs.readFileSync(tsconfigFullPath, "utf-8"));
    console.log(`✅ Loaded: ${tsconfigPathInput}`);
  } else {
    console.log(
      `⚠️  Could not find ${tsconfigPathInput}, creating a new one...`
    );
    tsconfig = { compilerOptions: { paths: {} } };
  }

  tsconfig.compilerOptions = tsconfig.compilerOptions || {};
  tsconfig.compilerOptions.paths = tsconfig.compilerOptions.paths || {};

  const existingAliasArray = tsconfig.compilerOptions.paths["@/*"];
  let defaultAlias = "./src/*";
  if (existingAliasArray && existingAliasArray.length > 0) {
    defaultAlias = existingAliasArray[0];
  }

  const { aliasPath } = await inquirer.prompt([
    {
      type: "input",
      name: "aliasPath",
      message: "What path should map to '@/*'?",
      default: defaultAlias,
    },
  ]);

  tsconfig.compilerOptions.paths["@/*"] = [aliasPath];

  const { chosenTheme } = await inquirer.prompt([
    {
      type: "list",
      name: "chosenTheme",
      message: "Which theme do you want to use for now?",
      choices: ["default"],
      default: "default",
    },
  ]);

  fs.writeFileSync(
    tsconfigFullPath,
    JSON.stringify(tsconfig, null, 2),
    "utf-8"
  );
  console.log(`✅ Updated tsconfig at: ${tsconfigPathInput}`);

  const flexnativePath = path.join(process.cwd(), "flexnative.json");
  let flexnativeConfig = {};
  if (fs.existsSync(flexnativePath)) {
    flexnativeConfig = JSON.parse(fs.readFileSync(flexnativePath, "utf-8"));
  }

  flexnativeConfig.tsconfigPath = tsconfigPathInput;
  flexnativeConfig.aliasPath = aliasPath;
  flexnativeConfig.theme = chosenTheme;

  fs.writeFileSync(
    flexnativePath,
    JSON.stringify(flexnativeConfig, null, 2),
    "utf-8"
  );
  console.log(`✅ Created/updated flexnative.json at: ${flexnativePath}`);

  const baseDirRelative = aliasPath.replace(/\/\*$/, ""); // e.g. './src'
  const baseDirAbsolute = path.join(process.cwd(), baseDirRelative);

  fs.mkdirSync(path.join(baseDirAbsolute, "constants"), { recursive: true });
  fs.mkdirSync(path.join(baseDirAbsolute, "hooks", "theme"), {
    recursive: true,
  });
  fs.mkdirSync(path.join(baseDirAbsolute, "theme"), { recursive: true });

  const colorsPath = path.join(baseDirAbsolute, "constants", "colors.ts");
  fs.writeFileSync(colorsPath, COLORS_TS_CONTENT, "utf-8");
  console.log(`✅ Created: ${path.relative(process.cwd(), colorsPath)}`);

  const useColorSchemePath = path.join(
    baseDirAbsolute,
    "hooks",
    "theme",
    "use-color-scheme.ts"
  );
  fs.writeFileSync(useColorSchemePath, USE_COLOR_SCHEME_CONTENT, "utf-8");
  console.log(
    `✅ Created: ${path.relative(process.cwd(), useColorSchemePath)}`
  );

  const themeColorsPath = path.join(
    baseDirAbsolute,
    "theme",
    "theme-colors.ts"
  );
  fs.writeFileSync(
    themeColorsPath,
    generateThemeColorsContent({
      colorsImport: "@/constants/colors",
      useColorSchemeImport: "@/hooks/theme/use-color-scheme",
    }),
    "utf-8"
  );
  console.log(`✅ Created: ${path.relative(process.cwd(), themeColorsPath)}`);

  console.log("\n🎉 Init finished!");
}

/**
 * ------------------------------------------------------------
 * COMMAND: add <URL>
 * ------------------------------------------------------------
 * 1. Read flexnative.json => get tsconfigPath, aliasPath
 * 2. Ensure '@/*' in tsconfig => find the base path (e.g. './src')
 * 3. Fetch the component JSON
 * 4. Save directly in @/components/ui/ (no subfolder for componentName)
 */
async function addCommand(url) {
  if (!url) {
    console.error("❌ Please provide a URL. Example:");
    console.error(
      "   flexnative-cli add https://registry.flexnative.com/c/accordion.json"
    );
    process.exit(1);
  }

  const flexnativePath = path.join(process.cwd(), "flexnative.json");
  if (!fs.existsSync(flexnativePath)) {
    console.error(
      "❌ flexnative.json not found. Run `flexnative-cli init` first."
    );
    process.exit(1);
  }
  const flexnativeConfig = JSON.parse(fs.readFileSync(flexnativePath, "utf-8"));
  const { tsconfigPath, aliasPath } = flexnativeConfig;

  if (!tsconfigPath || !aliasPath) {
    console.error(
      "❌ Missing config in flexnative.json. Run `flexnative-cli init` again."
    );
    process.exit(1);
  }

  const tsconfigFullPath = path.join(process.cwd(), tsconfigPath);
  if (!fs.existsSync(tsconfigFullPath)) {
    console.error(`❌ Could not find tsconfig at: ${tsconfigFullPath}`);
    process.exit(1);
  }
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigFullPath, "utf-8"));
  const userAliasArray = tsconfig?.compilerOptions?.paths?.["@/*"] ?? [];
  if (!userAliasArray.length) {
    console.error(
      "❌ '@/*' was not found in your tsconfig. Run `flexnative-cli init`."
    );
    process.exit(1);
  }

  const baseDirRelative = userAliasArray[0].replace(/\/\*$/, "");
  const baseDirAbsolute = path.join(process.cwd(), baseDirRelative);

  console.log(`🔄 Fetching component from ${url}...`);
  let componentJson;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Request failed. Status: ${response.status}`);
    }
    componentJson = await response.json();
  } catch (err) {
    console.error(`❌ Error fetching component: ${err.message}`);
    process.exit(1);
  }

  const componentName = componentJson.name || "unnamed-component";
  console.log(`✅ Downloaded component: ${componentName}`);

  const uiFolder = path.join(baseDirAbsolute, "components", "ui");
  fs.mkdirSync(uiFolder, { recursive: true });

  if (!componentJson.files || !Array.isArray(componentJson.files)) {
    console.error("❌ Component JSON does not contain a valid 'files' array.");
    process.exit(1);
  }

  for (const file of componentJson.files) {
    const filePath = path.join(uiFolder, file.path);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, file.content, "utf-8");
    console.log(`📄 Saved: ${path.relative(process.cwd(), filePath)}`);
  }

  console.log("\n🎉 Done adding component!");
}

/** ------------------------------------------------------------------
 * THEME FILE CONTENTS
 * ------------------------------------------------------------------ **/
const COLORS_TS_CONTENT = `export default {
  light: {
    text: "#000",
    background: "#ffffff",
    tint: "#2f95dc",
    tabIconDefault: "#ccc",
    tabIconSelected: "#2f95dc",
    "muted-foreground": "hsl(240, 3.8%, 46.1%)",
    primary: "hsl(240, 5.9%, 10%)",
    "primary-foreground": "#fff",
    muted: "hsl(240, 4.8%, 95.9%)",
    destructive: "hsl(0, 84.2%, 60.2%)",
    "destructive-foreground": "#fff",
    border: "hsl(240, 5.9%, 90%)",
    input: "hsl(240, 5.9%, 90%)",
    "chart-1": "hsl(240, 5.9%, 10%)"
  },
  dark: {
    text: "#ffffff",
    background: "#000",
    tint: "#fff",
    tabIconDefault: "#ccc",
    tabIconSelected: "#fff",
    "muted-foreground": "hsl(240, 5%, 64.9%)",
    primary: "hsl(0, 0%, 98%)",
    "primary-foreground": "#000",
    muted: "hsl(240, 3.7%, 15.9%)",
    destructive: "hsl(0, 62.8%, 30.6%)",
    "destructive-foreground": "#fff",
    border: "hsl(240, 3.7%, 15.9%)",
    input: "hsl(240, 3.7%, 15.9%)",
    "chart-1": "hsl(240, 3.7%, 90.9%)"
  }
};
`;

const USE_COLOR_SCHEME_CONTENT = `export { useColorScheme } from 'react-native';
`;

function generateThemeColorsContent({ colorsImport, useColorSchemeImport }) {
  return `import Colors from "${colorsImport}";
import { useColorScheme } from "${useColorSchemeImport}";

export function getThemeColors() {
  const theme = useColorScheme() ?? "light";
  return Colors[theme];
}
`;
}
