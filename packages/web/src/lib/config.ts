const defaultApiBase = "http://localhost:4000";
const defaultWsBase = "ws://localhost:4000/ws";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? defaultApiBase;
export const WS_BASE_URL =
  import.meta.env.VITE_WS_URL?.replace(/\/$/, "") ?? defaultWsBase;
