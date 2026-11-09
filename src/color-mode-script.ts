import { COLOR_MODE_COOKIE, COLOR_MODE_COOKIE_ATTRIBUTES } from "./lib/color-mode";

// Inlined as the first child of <head> when the server renders "system": it
// blocks the first paint until .dark matches the device. Visitors from the
// Nuxt site get their choice moved from localStorage into the cookie once;
// a light or dark choice reloads, so the server renders it.
export const COLOR_MODE_SCRIPT = `(()=>{const d=document;let m="system";try{const k="nuxt-color-mode",s=localStorage.getItem(k);if(!/(^|;\\s*)${COLOR_MODE_COOKIE}=/.test(d.cookie)&&/^(light|dark|system)$/.test(s)){d.cookie="${COLOR_MODE_COOKIE}="+s+"; ${COLOR_MODE_COOKIE_ATTRIBUTES}";localStorage.removeItem(k);m=s;if(s!=="system")location.reload()}}catch{}if(m==="dark"||m==="system"&&matchMedia("(prefers-color-scheme: dark)").matches)d.documentElement.classList.add("dark")})()`;
