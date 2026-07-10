import assert from "node:assert/strict";
import test from "node:test";
import { selectNpmAuthMode } from "../src/release/auth-mode.mjs";

test("uses trusted publishing when the package already exists", () => {
  assert.equal(selectNpmAuthMode({ versionExists: false, packageExists: true, hasBootstrapToken: false }), "trusted");
});

test("permits bootstrap only for a missing package with a one-time token", () => {
  assert.equal(selectNpmAuthMode({ versionExists: false, packageExists: false, hasBootstrapToken: true }), "bootstrap");
  assert.throws(
    () => selectNpmAuthMode({ versionExists: false, packageExists: false, hasBootstrapToken: false }),
    /NPM_BOOTSTRAP_TOKEN/,
  );
});

test("never republishes an immutable package version", () => {
  assert.throws(
    () => selectNpmAuthMode({ versionExists: true, packageExists: true, hasBootstrapToken: true }),
    /already published/,
  );
});
