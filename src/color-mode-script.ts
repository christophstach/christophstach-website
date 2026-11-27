import { COLOR_MODE_COOKIE } from "./lib/color-mode";

// Inlined as the first child of <head>: synchronously resolves the `color-mode`
// cookie (or device preference when "system"/unset) before first paint so pages
// stay cookie-independent on SSR and can be Edge-ISR cached without theme flash.
export const COLOR_MODE_SCRIPT = `(()=>{const m=document.cookie.match(/(?:^|;\\s*)${COLOR_MODE_COOKIE}=([^;]*)/),v=m?m[1].trim():"";const d=v==="dark"||(v!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);})()`;
