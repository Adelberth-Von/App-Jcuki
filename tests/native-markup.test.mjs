import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Browser rendering accepts raw strings in View; React Native throws at runtime.
test("native view containers never receive bare literal text children", () => {
  const root = new URL("../src/", import.meta.url);
  const views = new Set([
    "View",
    "ScrollView",
    "SafeAreaView",
    "Modal",
    "KeyboardAvoidingView",
    "Row",
    "Card",
    "Press",
    "Screen",
  ]);
  const violations = [];
  function scan(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        scan(file);
        continue;
      }
      if (!file.endsWith(".tsx") || file.endsWith(".web.tsx")) continue;
      const source = ts.createSourceFile(
        file,
        readFileSync(file, "utf8"),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      function visit(node) {
        if (
          ts.isJsxElement(node) &&
          views.has(node.openingElement.tagName.getText(source))
        ) {
          for (const child of node.children) {
            const literal = ts.isJsxText(child)
              ? child.text.trim().length > 0
              : ts.isJsxExpression(child) &&
                child.expression &&
                (ts.isStringLiteral(child.expression) ||
                  ts.isNumericLiteral(child.expression));
            if (literal)
              violations.push(
                path.relative(path.dirname(file), file) +
                  ":" +
                  (source.getLineAndCharacterOfPosition(child.getStart(source))
                    .line +
                    1),
              );
          }
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
  }
  scan(fileURLToPath(root));
  assert.deepEqual(
    violations,
    [],
    "Wrap text in Txt/Text so the native screens can open",
  );
});
