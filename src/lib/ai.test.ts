import { afterEach, describe, expect, it } from "vitest";
import { advisorConfiguration } from "@/lib/ai";

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
});

describe("advisor configuration", () => {
  it("is disabled until an explicit endpoint is configured", () => {
    delete process.env.BRANCHLINE_ADVISOR_ENDPOINT;
    expect(advisorConfiguration()).toBeUndefined();
  });

  it("accepts an explicitly configured HTTPS endpoint", () => {
    process.env.BRANCHLINE_ADVISOR_ENDPOINT = "https://provider.example/v1/chat/completions";
    process.env.BRANCHLINE_ADVISOR_MODEL = "release-reviewer";
    expect(advisorConfiguration()).toMatchObject({ endpoint: "https://provider.example/v1/chat/completions", model: "release-reviewer" });
  });

  it("allows HTTP only for a loopback provider", () => {
    process.env.BRANCHLINE_ADVISOR_ENDPOINT = "http://127.0.0.1:1234/v1/chat/completions";
    process.env.BRANCHLINE_ADVISOR_MODEL = "local-reviewer";
    expect(advisorConfiguration()).toMatchObject({ model: "local-reviewer" });
    process.env.BRANCHLINE_ADVISOR_ENDPOINT = "http://provider.example/v1/chat/completions";
    expect(() => advisorConfiguration()).toThrow("must use HTTPS");
  });
});
