#!/usr/bin/env node

import fetch from "node-fetch";
import fs from "fs";
import path from "path";

// URL passada como argumento para o CLI
const url = process.argv[2];
if (!url) {
  console.error("❌ Please provide the URL of the component JSON.");
  process.exit(1);
}

async function addComponent(url) {
  console.log(`🔄 Fetching component from ${url}...`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error("❌ Failed to fetch the component.");
      process.exit(1);
    }

    const json = await response.json();

    console.log(`✅ Downloaded ${json.name}.`);
    console.log(`💾 Saving ${json.files[0].path}...`);

    // Salvar o arquivo no diretório atual do usuário
    fs.writeFileSync(
      path.join(process.cwd(), json.files[0].path),
      json.files[0].content
    );

    console.log("🎉 Component added successfully!");
  } catch (error) {
    console.error("❌ An error occurred:", error.message);
    process.exit(1);
  }
}

addComponent(url);
