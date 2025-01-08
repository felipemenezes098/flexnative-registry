import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { exec } from "child_process";

export async function addCommand(url) {
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

  // Instalar dependências
  const dependencies = componentJson.dependencies || [];
  const devDependencies = componentJson.devDependencies || [];

  if (dependencies.length > 0) {
    console.log("\n📦 Installing dependencies:");
    for (const dep of dependencies) {
      await installDependency(dep, false);
    }
  }

  if (devDependencies.length > 0) {
    console.log("\n🔧 Installing devDependencies:");
    for (const dep of devDependencies) {
      await installDependency(dep, true);
    }
  }

  console.log("\n🎉 Done adding component and installing dependencies!");
}

function installDependency(dep, isDev) {
  return new Promise((resolve, reject) => {
    const command = `npm install ${dep} ${isDev ? "--save-dev" : "--save"}`;
    const emoji = isDev ? "🔧" : "📦";

    console.log(`${emoji} Installing ${dep}...`);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Failed to install ${dep}: ${stderr}`);
        return reject(error);
      }
      console.log(`✅ ${dep} installed successfully!`);
      resolve();
    });
  });
}
