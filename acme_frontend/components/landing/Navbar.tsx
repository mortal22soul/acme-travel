"use client";

import Link from "next/link";
import Image from "next/image";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { usePathname } from "next/navigation";
import { IconChevronDown, IconDeviceDesktop, IconLogin, IconMoon, IconPlane, IconShoppingBag, IconSun, IconUser } from "@tabler/icons-react";
import logo from "@/app/assets/acme-corp.svg";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useTheme, type ThemeMode } from "@/context/ThemeContext";

export default function Nav() {
  const pathname = usePathname();
  const { isAuthenticated, isReady, logout } = useAuth();
  const { itemCount } = useCart();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const menu = useId();
  const menuButton = useRef<HTMLButtonElement>(null);
  const current = (path: string) => pathname === path ? "page" as const : undefined;
  const ThemeIcon = theme === "light" ? IconSun : theme === "dark" ? IconMoon : IconDeviceDesktop;

  function closeOnEscape(event: KeyboardEvent) {
    if (event.key !== "Escape" || !open) return;
    setOpen(false);
    menuButton.current?.focus();
  }

  async function signOut() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await logout();
      setOpen(false);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to sign out");
    } finally { setPending(false); }
  }

  return <header className="travel-surface sticky top-0 z-40 border-x-0 border-t-0">
    <nav aria-label="Primary" className="site-nav mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 px-4 py-3 sm:px-6 lg:px-8" onKeyDown={closeOnEscape}>
      <Link href="/" aria-label="ACME Travel home" aria-current={current("/")} className="site-home shrink-0 rounded-md" onClick={() => setOpen(false)}>
        <Image src={logo} alt="" className="site-logo" />
      </Link>
      <button type="button" className="flex min-h-11 flex-col justify-center gap-1.5 rounded-lg px-2 md:hidden"
        ref={menuButton} aria-label="Menu" aria-expanded={open} aria-controls={menu} onClick={() => setOpen(value => !value)}>
        <span className="h-0.5 w-6 bg-current" /><span className="h-0.5 w-8 bg-current" /><span className="h-0.5 w-6 bg-current" />
      </button>
      <ul id={menu} className={`${open ? "flex" : "hidden"} w-full flex-col gap-2 pt-3 md:flex md:w-auto md:flex-row md:items-center md:gap-3 md:pt-0`}>
        <li><Link href="/destinations" aria-current={current("/destinations")} onClick={() => setOpen(false)} className="action">
          <IconPlane size={16} aria-hidden="true" /> Explore Destinations
        </Link></li>
        {isReady && isAuthenticated && <li>
          <Link href="/user" aria-current={current("/user")} onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-1.5 rounded-full px-3 font-medium hover:bg-muted">
            <IconUser size={17} aria-hidden="true" /> My Account
          </Link>
        </li>}
        <li><Link href="/cart" aria-current={current("/cart")} aria-label={`Cart with ${itemCount} travelers`}
          onClick={() => setOpen(false)} className="travel-blue relative inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full px-2 hover:bg-muted">
          <IconShoppingBag size={21} aria-hidden="true" />
          <span className="md:sr-only">Cart</span>
          {itemCount > 0 && <span aria-hidden="true" className="rounded-full bg-cyan-700 px-1.5 text-xs font-bold leading-5 text-white md:absolute md:top-0 md:right-0">{itemCount}</span>}
        </Link></li>
        <li><label className="travel-blue relative inline-flex items-center">
          <span className="sr-only">Theme</span>
          <ThemeIcon size={17} className="pointer-events-none absolute start-3" aria-hidden="true" />
          <select name="theme" value={theme} className="secondary-action cursor-pointer appearance-none ps-9 pe-9 forced-colors:appearance-auto forced-colors:pe-3"
            onChange={event => setTheme(event.target.value as ThemeMode)}>
            <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
          </select>
          <IconChevronDown size={15} className="pointer-events-none absolute end-3 forced-colors:hidden" aria-hidden="true" />
        </label></li>
        {isReady && isAuthenticated
          ? <li><button type="button" className="min-h-11 rounded-full px-3 font-medium hover:bg-muted" disabled={pending} onClick={() => void signOut()}>{pending ? "Signing out…" : "Sign out"}</button></li>
          : <li><Link href="/login" aria-current={current("/login")} onClick={() => setOpen(false)} className="inline-flex min-h-11 items-center gap-1 rounded-full bg-blue-700 px-4 font-medium text-white hover:bg-blue-800">
            <IconLogin size={17} aria-hidden="true" /> Login
          </Link></li>}
      </ul>
      <p role="alert" className="status-error w-full">{error}</p>
    </nav>
  </header>;
}
