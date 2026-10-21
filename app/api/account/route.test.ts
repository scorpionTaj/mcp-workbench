import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const h = vi.hoisted(() => ({
  options: undefined as undefined | { sessionOnly?: boolean; rateLimit?: string },
  findBilling: vi.fn(),
  deleteUserFiles: vi.fn(),
  stripeClient: vi.fn(),
  retrieveCustomer: vi.fn(),
  listSubscriptions: vi.fn(),
  cancelSubscription: vi.fn(),
  deleteCustomer: vi.fn(),
  deleteTable: vi.fn(),
  logError: vi.fn(),
  operations: [] as string[],
}));

vi.mock("drizzle-orm", () => ({ eq: (...args: unknown[]) => args }));
vi.mock("@/lib/api", () => ({
  withUser: (handler: (request: Request, user: { id: string; role: string }) => Promise<Response>, options: typeof h.options) => {
    h.options = options;
    return (request: Request) => handler(request, { id: "user_1", role: "user" });
  },
}));
vi.mock("@/lib/account-data", () => ({ deleteUserFiles: h.deleteUserFiles }));
vi.mock("@/lib/billing", () => ({ stripeClient: h.stripeClient }));
vi.mock("@/lib/db", () => ({
  db: {
    query: { billingAccounts: { findFirst: h.findBilling } },
    delete: h.deleteTable,
  },
  schema: { billingAccounts: { userId: "userId" }, feedbacks: "feedbacks", user: { id: "id" } },
}));
vi.mock("@/lib/logger", () => ({ default: { error: h.logError } }));

const { DELETE } = await import("@/app/api/account/route");

function request() {
  return new NextRequest("https://cloud.example.com/api/account", {
    method: "DELETE",
    body: JSON.stringify({ confirmation: "DELETE" }),
    headers: { "content-type": "application/json" },
  });
}

function asyncItems(items: { id: string; status: string }[] = []) {
  return {
    async *[Symbol.asyncIterator]() {
      yield* items;
    },
  };
}

beforeEach(() => {
  h.operations = [];
  h.findBilling.mockReset();
  h.deleteUserFiles.mockReset().mockImplementation(async () => { h.operations.push("files"); });
  h.retrieveCustomer.mockReset().mockImplementation(async () => { h.operations.push("retrieve"); return { id: "cus_1" }; });
  h.listSubscriptions.mockReset().mockImplementation(() => { h.operations.push("list"); return asyncItems([{ id: "sub_1", status: "active" }]); });
  h.cancelSubscription.mockReset().mockImplementation(async () => { h.operations.push("cancel"); });
  h.deleteCustomer.mockReset().mockImplementation(async () => { h.operations.push("customer-delete"); });
  h.stripeClient.mockReset().mockReturnValue({
    customers: { retrieve: h.retrieveCustomer, del: h.deleteCustomer },
    subscriptions: { list: h.listSubscriptions, cancel: h.cancelSubscription },
  });
  h.deleteTable.mockReset().mockImplementation(() => ({
    where: () => ({ returning: async () => { h.operations.push("user-delete"); return [{ id: "user_1" }]; } }),
  }));
});

afterEach(() => vi.clearAllMocks());

describe("DELETE /api/account", () => {
  it("requires a browser session and cancels billing before deleting data", async () => {
    h.findBilling.mockResolvedValue({ stripeCustomerId: "cus_1" });

    const response = await DELETE(request(), { params: Promise.resolve({}) });

    expect(response.status).toBe(200);
    expect(h.options).toMatchObject({ sessionOnly: true, rateLimit: "accountDelete" });
    expect(h.operations).toEqual(["retrieve", "list", "cancel", "customer-delete", "files", "user-delete"]);
  });

  it("can finish deletion when Stripe already removed the customer on an earlier attempt", async () => {
    h.findBilling.mockResolvedValue({ stripeCustomerId: "cus_1" });
    h.retrieveCustomer.mockRejectedValue({ code: "resource_missing" });

    const response = await DELETE(request(), { params: Promise.resolve({}) });

    expect(response.status).toBe(200);
    expect(h.listSubscriptions).not.toHaveBeenCalled();
    expect(h.deleteCustomer).not.toHaveBeenCalled();
    expect(h.deleteUserFiles).toHaveBeenCalledWith("user_1");
  });
});
