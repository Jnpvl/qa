const productionApi = "https://qa-api.161-35-59-139.sslip.io"

export const apiBase = (
  process.env.NEXT_PUBLIC_QA_API_URL?.trim() ||
  (process.env.NODE_ENV === "production" ? productionApi : "")
).replace(/\/$/, "")
