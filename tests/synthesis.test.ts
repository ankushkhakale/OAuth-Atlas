import test from "node:test";
import assert from "node:assert/strict";
import { validateDraft } from "../lib/research/synthesize.ts";
const valid = {
  title: "Register the app",
  detail: "Create the app in your developer console.",
  source: "1",
  proof: "Register an app in the developer console.",
};
const texts = new Map([
  ["1", "Register an app in the developer console. Configure a redirect URI."],
]);
test("local model output cannot cite invented sources or fabricated proof", () => {
  assert.doesNotThrow(() =>
    validateDraft({ steps: [valid, valid, valid], blockers: [] }, texts),
  );
  assert.throws(() =>
    validateDraft(
      { steps: [valid, valid, { ...valid, source: "9" }], blockers: [] },
      texts,
    ),
  );
  assert.throws(() =>
    validateDraft(
      {
        steps: [valid, valid, { ...valid, proof: "Approval takes one day." }],
        blockers: [],
      },
      texts,
    ),
  );
  assert.throws(() =>
    validateDraft(
      {
        steps: [
          valid,
          valid,
          {
            ...valid,
            detail:
              "Visit https://attacker.example and submit your credentials.",
          },
        ],
        blockers: [],
      },
      texts,
    ),
  );
});

test("proof matching tolerates HTML spacing and invisible heading anchors", () => {
  const spaced = {
    ...valid,
    proof: "Register an app in the developer console.",
  };
  assert.doesNotThrow(() =>
    validateDraft(
      { steps: [spaced, spaced, spaced], blockers: [] },
      new Map([["1", "Register an app in the developer\u2060 console ."]]),
    ),
  );
});
