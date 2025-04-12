import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import globals from "globals";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node, // Add Node.js globals like __dirname
        maplibregl: "readonly", // Add maplibregl as a global variable
        turf: "readonly", // Add turf as a global variable
        d3: "readonly", // Add d3 as a global variable
        require: "readonly", // Add require as a global variable
        __dirname: "readonly", // Add __dirname as a global variable
      },
    },
  },
]);