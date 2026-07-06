/** App-wide static configuration. Kept out of components per project conventions. */

/** Only PDFs are supported for uploads in this MVP. */
export const ACCEPTED_FILE_TYPES = ['application/pdf'] as const
export const ACCEPTED_FILE_EXTENSIONS = ['.pdf'] as const

/** Guard rail so a single mock upload can't blow past IndexedDB quotas. */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB

export const ROOT_PARENT_ID = null

export const APP_NAME = 'Data Room'

/** Label for the datarooms list — the app home and breadcrumb root. */
export const DATAROOMS_LABEL = 'Datarooms'
