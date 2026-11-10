// Inlined as the first child of <head> when the server renders "system": it
// blocks the first paint until .dark matches the device.
export const COLOR_MODE_SCRIPT = `matchMedia("(prefers-color-scheme: dark)").matches&&document.documentElement.classList.add("dark")`;
