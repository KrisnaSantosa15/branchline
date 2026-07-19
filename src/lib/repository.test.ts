import { describe, expect, it } from "vitest";
import { RepositoryError, isRemoteRepositorySource, validateRemoteRepositoryUrl } from "@/lib/repository";

describe("remote repository sources", () => {
  it("accepts a credential-free public HTTPS Git URL", () => {
    expect(validateRemoteRepositoryUrl("https://github.com/openai/codex.git")).toBe("https://github.com/openai/codex.git");
    expect(isRemoteRepositorySource("https://github.com/openai/codex.git")).toBe(true);
  });

  it.each(["http://github.com/openai/codex.git", "https://user:token@github.com/org/repo.git", "https://localhost/repo.git", "https://192.168.1.5/repo.git", "https://github.com:8443/org/repo.git"]) ("rejects an unsafe remote URL: %s", (source) => {
    expect(() => validateRemoteRepositoryUrl(source)).toThrow(RepositoryError);
  });
});
