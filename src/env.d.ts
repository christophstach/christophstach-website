/* eslint-disable no-unused-vars */
/* eslint-disable no-redeclare */
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SMTP_HOST: string
  readonly VITE_SMTP_PORT: number
  readonly VITE_SMTP_USERNAME: string
  readonly VITE_SMTP_PASSWORD: string
  readonly VITE_SMTP_SENDER: string
  readonly VITE_SMTP_RECIPIENT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
