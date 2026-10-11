import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { allTranslationKeys, translate, translations } from "../src/i18n.ts";

test("Indonesian and English offer the same nonempty translation keys", () => {
  assert.deepEqual(
    Object.keys(translations.id).sort(),
    Object.keys(translations.en).sort(),
  );
  assert.deepEqual(
    [...allTranslationKeys].sort(),
    Object.keys(translations.id).sort(),
  );
  for (const language of ["id", "en"])
    for (const [key, text] of Object.entries(translations[language])) {
      assert.equal(typeof text, "string", `${language}.${key}`);
      assert.ok(text.trim().length > 0, `${language}.${key} is empty`);
      assert.equal(
        translate(language, key),
        text,
        `${language}.${key} falls back unexpectedly`,
      );
    }
});

test("literal UI labels and notification message keys exist in both languages", () => {
  const directory = join(dirname(fileURLToPath(import.meta.url)), "../src");
  const missing = [];
  function scan(folder) {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const path = join(folder, entry.name);
      if (entry.isDirectory()) {
        scan(path);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(path)) continue;
      const source = ts.createSourceFile(
        path,
        readFileSync(path, "utf8"),
        ts.ScriptTarget.Latest,
        true,
      );
      function visit(node) {
        if (
          ts.isCallExpression(node) &&
          ["t", "notify"].includes(
            node.expression.getText(source).split(".").pop(),
          ) &&
          node.arguments[0]
        ) {
          // notify(message, true) intentionally accepts already-localized raw text.
          const rawMessage =
            node.arguments[1]?.kind === ts.SyntaxKind.TrueKeyword;
          const argument = node.arguments[0];
          const keys = ts.isStringLiteral(argument)
            ? [argument.text]
            : ts.isConditionalExpression(argument)
              ? [argument.whenTrue, argument.whenFalse]
                  .filter(ts.isStringLiteral)
                  .map((item) => item.text)
              : [];
          if (!rawMessage)
            for (const key of keys)
              if (
                !Object.hasOwn(translations.id, key) ||
                !Object.hasOwn(translations.en, key)
              )
                missing.push(`${path}:${key}`);
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
  }
  scan(directory);
  assert.deepEqual(missing, []);
});

test("dynamic state, appearance, and weekday labels have translations", () => {
  const keys = [
    "yes",
    "maybe",
    "no",
    "unknown",
    "all",
    "pending",
    "confirmed",
    "past",
    "cancelled",
    "light",
    "dark",
    "system",
    "h24",
    "h12",
    ...Array.from({ length: 7 }, (_, day) => `weekday${day}`),
  ];
  for (const language of ["id", "en"])
    for (const key of keys)
      assert.ok(
        Object.hasOwn(translations[language], key),
        `${language}.${key}`,
      );
  assert.equal(translate("id", "signature"), "Develop by Terrence");
  assert.equal(translate("en", "signature"), "Develop by Terrence");
});
