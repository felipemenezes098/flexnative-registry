#!/usr/bin/env node

import fetch from "node-fetch";
import fs from "fs";
import path from "path";

// Captura os argumentos
const args = process.argv.slice(2);
console.log("Arguments received:", args);

const command = args[0];
const url = args[1];

console.log("Command:", command);
console.log("URL:", url);

if (command !== "add") {
  console.error("❌ Invalid command. Use 'add' followed by the component URL.");
  process.exit(1);
}

if (!url || !/^https?:\/\/[\w.-]+/.test(url)) {
  console.error(
    "❌ Please provide a valid URL (e.g., https://registry.flexnative.com/c/accordion.json)."
  );
  process.exit(1);
}

async function addComponent(url) {
  console.log(`🔄 Fetching component from ${url}...`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(
        `❌ Failed to fetch the component. HTTP Status: ${response.status}`
      );
      process.exit(1);
    }

    const json = await response.json();
    console.log("Response JSON:", json);

    console.log(`✅ Downloaded component: ${json.name}`);

    const filePath = path.join(process.cwd(), json.files[0].path);
    fs.writeFileSync(filePath, json.files[0].content);
    console.log(`🎉 Component saved at: ${filePath}`);
  } catch (error) {
    console.error(`❌ An error occurred: ${error.message}`);
    process.exit(1);
  }
}

addComponent(url);
