import assert from "node:assert/strict";
import test from "node:test";
import { markdownCell, xmlDecode } from "../src/shared/text.mjs";

test("escapes Markdown cell backslashes and separators", () => {
  assert.equal(markdownCell("a\\b|c\nnext"), "a\\\\b\\|c next");
});

test("decodes XML entities exactly once", () => {
  assert.equal(xmlDecode("&lt;tag attr=&quot;x&quot;&gt;A&amp;B&apos;s&lt;/tag&gt;"), '<tag attr="x">A&B\'s</tag>');
  assert.equal(xmlDecode("&amp;lt;safe&amp;gt;"), "&lt;safe&gt;");
});
