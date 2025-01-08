import fs from "fs";
import path from "path";
import inquirer from "inquirer";
import {
  COLORS_TS_CONTENT,
  USE_COLOR_SCHEME_CONTENT,
  generateThemeColorsContent,
} from "../utils/theme-helpers.js";

export async function initCommand() {
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
