#!/usr/bin/env node

import { initCommand } from "./src/commands/init.js";
import { addCommand } from "./src/commands/add.js";

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
