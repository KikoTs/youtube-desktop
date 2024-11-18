// electron.vite.config.mts
import { resolve as resolve4, dirname as dirname4, join } from "node:path";
import { fileURLToPath as fileURLToPath4 } from "node:url";
import { defineConfig, defineViteConfig } from "electron-vite";
import builtinModules from "builtin-modules";
import viteResolve from "vite-plugin-resolve";
import Inspect from "vite-plugin-inspect";
import solidPlugin from "vite-plugin-solid";

// vite-plugins/plugin-importer.mts
import { basename, relative, resolve, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { globSync } from "glob";
import { Project } from "ts-morph";
var __electron_vite_injected_import_meta_url = "file:///C:/Users/todor/Downloads/dam/youtube-desktop/vite-plugins/plugin-importer.mts";
var snakeToCamel = (text) => text.replace(/-(\w)/g, (_, letter) => letter.toUpperCase());
var pluginVirtualModuleGenerator = (mode) => {
  const __dirname2 = dirname(fileURLToPath(__electron_vite_injected_import_meta_url));
  const project = new Project({
    tsConfigFilePath: resolve(__dirname2, "..", "tsconfig.json"),
    skipAddingFilesFromTsConfig: true,
    skipLoadingLibFiles: true,
    skipFileDependencyResolution: true
  });
  const srcPath = resolve(__dirname2, "..", "src");
  const plugins = globSync([
    "src/plugins/*/index.{js,ts}",
    "src/plugins/*.{js,ts}",
    "!src/plugins/utils/**/*",
    "!src/plugins/utils/*"
  ]).map((path) => {
    let name = basename(path);
    if (name === "index.ts" || name === "index.js") {
      name = basename(resolve(path, ".."));
    }
    name = name.replace(extname(name), "");
    return { name, path };
  });
  const src = project.createSourceFile("vm:pluginIndexes", (writer) => {
    for (const { name, path } of plugins) {
      const relativePath = relative(resolve(srcPath, ".."), path).replace(/\\/g, "/");
      writer.writeLine(`import ${snakeToCamel(name)}Plugin, { pluginStub as ${snakeToCamel(name)}PluginStub } from "./${relativePath}";`);
    }
    writer.blankLine();
    writer.writeLine(`export const ${mode}Plugins = {`);
    for (const { name } of plugins) {
      const checkMode = mode === "main" ? "backend" : mode;
      writer.writeLine(
        `  ...(${snakeToCamel(name)}Plugin['${checkMode}'] ? { "${name}": ${snakeToCamel(name)}Plugin } : {}),`
      );
    }
    writer.writeLine("};");
    writer.blankLine();
    writer.writeLine("export const allPlugins = {");
    for (const { name } of plugins) {
      writer.writeLine(`  "${name}": ${snakeToCamel(name)}PluginStub,`);
    }
    writer.writeLine("};");
    writer.blankLine();
  });
  return src.getText();
};

// vite-plugins/plugin-loader.mts
import { readFile } from "node:fs/promises";
import { resolve as resolve2, basename as basename2, dirname as dirname2 } from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";
import { createFilter } from "vite";
import {
  Project as Project2,
  ts,
  VariableDeclarationKind
} from "ts-morph";
var __electron_vite_injected_import_meta_url2 = "file:///C:/Users/todor/Downloads/dam/youtube-desktop/vite-plugins/plugin-loader.mts";
function plugin_loader_default(mode) {
  const pluginFilter = createFilter([
    "src/plugins/*/index.{js,ts}",
    "src/plugins/*"
  ]);
  return {
    name: "ytm-plugin-loader",
    async load(id) {
      if (!pluginFilter(id)) return null;
      const __dirname2 = dirname2(fileURLToPath2(__electron_vite_injected_import_meta_url2));
      const project = new Project2({
        tsConfigFilePath: resolve2(__dirname2, "..", "tsconfig.json"),
        skipAddingFilesFromTsConfig: true,
        skipLoadingLibFiles: true,
        skipFileDependencyResolution: true
      });
      const src = project.createSourceFile(
        "_pf" + basename2(id),
        await readFile(id, "utf8")
      );
      const exports = src.getExportedDeclarations();
      let objExpr = void 0;
      for (const [name, [expr]] of exports) {
        if (name !== "default") continue;
        switch (expr.getKind()) {
          case ts.SyntaxKind.ObjectLiteralExpression: {
            objExpr = expr.asKindOrThrow(ts.SyntaxKind.ObjectLiteralExpression);
            break;
          }
          case ts.SyntaxKind.CallExpression: {
            const callExpr = expr.asKindOrThrow(ts.SyntaxKind.CallExpression);
            if (callExpr.getArguments().length !== 1) continue;
            const name2 = callExpr.getExpression().getText();
            if (name2 !== "createPlugin") continue;
            const arg = callExpr.getArguments()[0];
            if (arg.getKind() !== ts.SyntaxKind.ObjectLiteralExpression)
              continue;
            objExpr = arg.asKindOrThrow(ts.SyntaxKind.ObjectLiteralExpression);
            break;
          }
        }
      }
      if (!objExpr) return null;
      const properties = objExpr.getProperties();
      const propertyNames = properties.map((prop) => {
        switch (prop.getKind()) {
          case ts.SyntaxKind.PropertyAssignment:
            return prop.asKindOrThrow(ts.SyntaxKind.PropertyAssignment).getName();
          case ts.SyntaxKind.ShorthandPropertyAssignment:
            return prop.asKindOrThrow(ts.SyntaxKind.ShorthandPropertyAssignment).getName();
          case ts.SyntaxKind.MethodDeclaration:
            return prop.asKindOrThrow(ts.SyntaxKind.MethodDeclaration).getName();
          default:
            throw new Error("Not implemented");
        }
      });
      const contexts = ["backend", "preload", "renderer", "menu"];
      for (const ctx of contexts) {
        if (mode === "none") {
          const index2 = propertyNames.indexOf(ctx);
          if (index2 === -1) continue;
          objExpr.getProperty(propertyNames[index2])?.remove();
          continue;
        }
        if (ctx === mode) continue;
        if (ctx === "menu" && mode === "backend") continue;
        const index = propertyNames.indexOf(ctx);
        if (index === -1) continue;
        objExpr.getProperty(propertyNames[index])?.remove();
      }
      const stubObjExpr = src.addVariableStatement({
        isExported: true,
        declarationKind: VariableDeclarationKind.Const,
        declarations: [
          {
            name: "pluginStub",
            initializer: (writer) => writer.write(objExpr.getText())
          }
        ]
      }).getDeclarations()[0].getInitializer();
      const stubProperties = stubObjExpr.getProperties();
      const stubPropertyNames = stubProperties.map((prop) => {
        switch (prop.getKind()) {
          case ts.SyntaxKind.PropertyAssignment:
            return prop.asKindOrThrow(ts.SyntaxKind.PropertyAssignment).getName();
          case ts.SyntaxKind.ShorthandPropertyAssignment:
            return prop.asKindOrThrow(ts.SyntaxKind.ShorthandPropertyAssignment).getName();
          case ts.SyntaxKind.MethodDeclaration:
            return prop.asKindOrThrow(ts.SyntaxKind.MethodDeclaration).getName();
          default:
            throw new Error("Not implemented");
        }
      });
      if (mode === "backend") contexts.pop();
      for (const ctx of contexts) {
        const index = stubPropertyNames.indexOf(ctx);
        if (index === -1) continue;
        stubObjExpr.getProperty(stubPropertyNames[index])?.remove();
      }
      return {
        code: src.getText()
      };
    }
  };
}

// vite-plugins/i18n-importer.mts
import { basename as basename3, relative as relative2, resolve as resolve3, extname as extname2, dirname as dirname3 } from "node:path";
import { fileURLToPath as fileURLToPath3 } from "node:url";
import { globSync as globSync2 } from "glob";
import { Project as Project3 } from "ts-morph";
var __electron_vite_injected_import_meta_url3 = "file:///C:/Users/todor/Downloads/dam/youtube-desktop/vite-plugins/i18n-importer.mts";
var snakeToCamel2 = (text) => text.replace(/-(\w)/g, (_, letter) => letter.toUpperCase());
var i18nImporter = () => {
  const __dirname2 = dirname3(fileURLToPath3(__electron_vite_injected_import_meta_url3));
  const project = new Project3({
    tsConfigFilePath: resolve3(__dirname2, "..", "tsconfig.json"),
    skipAddingFilesFromTsConfig: true,
    skipLoadingLibFiles: true,
    skipFileDependencyResolution: true
  });
  const srcPath = resolve3(__dirname2, "..", "src");
  const plugins = globSync2(["src/i18n/resources/*.json"]).map((path) => {
    const nameWithExt = basename3(path);
    const name = nameWithExt.replace(extname2(nameWithExt), "");
    return { name, path };
  });
  const src = project.createSourceFile("vm:i18n", (writer) => {
    for (const { name, path } of plugins) {
      const relativePath = relative2(resolve3(srcPath, ".."), path).replace(/\\/g, "/");
      writer.writeLine(`import ${snakeToCamel2(name)}Json from "./${relativePath}";`);
    }
    writer.blankLine();
    writer.writeLine("export const languageResources = {");
    for (const { name } of plugins) {
      writer.writeLine(`  "${name}": {`);
      writer.writeLine(`    translation: ${snakeToCamel2(name)}Json,`);
      writer.writeLine("  },");
    }
    writer.writeLine("};");
    writer.blankLine();
  });
  return src.getText();
};

// electron.vite.config.mts
var __electron_vite_injected_import_meta_url4 = "file:///C:/Users/todor/Downloads/dam/youtube-desktop/electron.vite.config.mts";
var __dirname = dirname4(fileURLToPath4(__electron_vite_injected_import_meta_url4));
var resolveAlias = {
  "@": resolve4(__dirname, "./src"),
  "@assets": resolve4(__dirname, "./assets")
};
var electron_vite_config_default = defineConfig({
  main: defineViteConfig(({ mode }) => {
    const commonConfig = {
      plugins: [
        plugin_loader_default("backend"),
        viteResolve({
          "virtual:i18n": i18nImporter(),
          "virtual:plugins": pluginVirtualModuleGenerator("main")
        })
      ],
      publicDir: "assets",
      build: {
        lib: {
          entry: "src/index.ts",
          formats: ["cjs"]
        },
        outDir: "dist/main",
        commonjsOptions: {
          ignoreDynamicRequires: true
        },
        rollupOptions: {
          external: ["electron", "custom-electron-prompt", ...builtinModules],
          input: "./src/index.ts"
        }
      },
      resolve: {
        alias: resolveAlias
      }
    };
    if (mode === "development") {
      commonConfig.build.sourcemap = "inline";
      commonConfig.plugins?.push(
        Inspect({
          build: true,
          outputDir: join(__dirname, ".vite-inspect/backend")
        })
      );
      return commonConfig;
    }
    return {
      ...commonConfig,
      build: {
        ...commonConfig.build,
        minify: true,
        cssMinify: true
      }
    };
  }),
  preload: defineViteConfig(({ mode }) => {
    const commonConfig = {
      plugins: [
        plugin_loader_default("preload"),
        viteResolve({
          "virtual:i18n": i18nImporter(),
          "virtual:plugins": pluginVirtualModuleGenerator("preload")
        })
      ],
      build: {
        lib: {
          entry: "src/preload.ts",
          formats: ["cjs"]
        },
        outDir: "dist/preload",
        commonjsOptions: {
          ignoreDynamicRequires: true
        },
        rollupOptions: {
          external: ["electron", "custom-electron-prompt", ...builtinModules],
          input: "./src/preload.ts"
        }
      },
      resolve: {
        alias: resolveAlias
      }
    };
    if (mode === "development") {
      commonConfig.build.sourcemap = "inline";
      commonConfig.plugins?.push(
        Inspect({
          build: true,
          outputDir: join(__dirname, ".vite-inspect/preload")
        })
      );
      return commonConfig;
    }
    return {
      ...commonConfig,
      build: {
        ...commonConfig.build,
        minify: true,
        cssMinify: true
      }
    };
  }),
  renderer: defineViteConfig(({ mode }) => {
    const commonConfig = {
      plugins: [
        plugin_loader_default("renderer"),
        viteResolve({
          "virtual:i18n": i18nImporter(),
          "virtual:plugins": pluginVirtualModuleGenerator("renderer")
        }),
        solidPlugin()
      ],
      root: "./src/",
      build: {
        lib: {
          entry: "src/index.html",
          formats: ["iife"],
          name: "renderer"
        },
        outDir: "dist/renderer",
        commonjsOptions: {
          ignoreDynamicRequires: true
        },
        rollupOptions: {
          external: ["electron", ...builtinModules],
          input: "./src/index.html"
        }
      },
      resolve: {
        alias: resolveAlias
      }
    };
    if (mode === "development") {
      commonConfig.build.sourcemap = "inline";
      commonConfig.plugins?.push(
        Inspect({
          build: true,
          outputDir: join(__dirname, ".vite-inspect/renderer")
        })
      );
      return commonConfig;
    }
    return {
      ...commonConfig,
      build: {
        ...commonConfig.build,
        minify: true,
        cssMinify: true
      }
    };
  })
});
export {
  electron_vite_config_default as default
};
