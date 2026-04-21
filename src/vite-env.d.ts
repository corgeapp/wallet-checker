/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string
    readonly VITE_QUEUE_STATUS_ENABLED?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
