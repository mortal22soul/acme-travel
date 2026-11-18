import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch, clearSession } from "@/lib/api";

describe("apiFetch", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("uses the same-origin BFF rather than exposing backend credentials to browser code", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 1 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await apiFetch("/me");

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith("/api/me", expect.objectContaining({ credentials: "same-origin" }));
  });

  it("notifies the auth context when a request is unauthorized", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    const listener = vi.fn();
    window.addEventListener("acme:session-ended", listener);

    await apiFetch("/me");

    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener("acme:session-ended", listener);
  });

  it("clears in-memory session subscribers", () => {
    const listener = vi.fn();
    window.addEventListener("acme:session-ended", listener);
    clearSession();
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener("acme:session-ended", listener);
  });
});
