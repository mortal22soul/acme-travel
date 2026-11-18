import { createElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CartProvider, useCart } from "@/context/CartContext";

function CartProbe() {
  const { addItem, itemCount, updateTravelers, removeItem } = useCart();
  const item = { tripId: 1, destination: "Paris", origin: "New York", departureDate: "2026-12-01", price: 1200 };
  return createElement("div", null,
    createElement("output", null, itemCount),
    createElement("button", { onClick: () => addItem(item) }, "add"),
    createElement("button", { onClick: () => updateTravelers(1, 99) }, "max"),
    createElement("button", { onClick: () => removeItem(1) }, "remove"),
  );
}

describe("CartProvider", () => {
  it("merges duplicate trips, limits travelers, and removes an item", () => {
    render(createElement(CartProvider, null, createElement(CartProbe)));
    fireEvent.click(screen.getByText("add"));
    fireEvent.click(screen.getByText("add"));
    expect(screen.getByRole("status")).toHaveTextContent("2");
    fireEvent.click(screen.getByText("max"));
    expect(screen.getByRole("status")).toHaveTextContent("10");
    fireEvent.click(screen.getByText("remove"));
    expect(screen.getByRole("status")).toHaveTextContent("0");
  });
});
