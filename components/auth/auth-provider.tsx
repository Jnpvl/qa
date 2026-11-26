"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { apiBase } from "@/lib/api-url"

export type WorkspaceUser = {
  id: string
  name: string
  email: string
  organizationId: string
  organizationName: string
  role: "owner" | "admin" | "member"
}

type SessionResponse = { accessToken: string; user: WorkspaceUser }
type AuthContextValue = {
  ready: boolean
  authenticated: boolean
  user: WorkspaceUser | null
  invitationToken: string | null
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (input: { name: string; email: string; password: string; organizationName?: string; invitationToken?: string }) => Promise<void>
  updateOrganizationName: (name: string) => void
  logout: () => void
  getAccessToken: () => Promise<string>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const tokenKey = "qa.auth.token"

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}/api/v1/auth${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  })
  const body = await response.json().catch(() => ({})) as { message?: string | string[] }
  if (!response.ok) throw new Error(Array.isArray(body.message) ? body.message[0] : body.message || "No fue posible conectar con el servicio de acceso.")
  return body as T
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<WorkspaceUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [invitationToken, setInvitationToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      const invite = new URLSearchParams(window.location.search).get("invite")
      if (active) setInvitationToken(invite)
      const savedToken = window.sessionStorage.getItem(tokenKey)
      if (savedToken) {
        try {
          const currentUser = await request<WorkspaceUser>("/me", { headers: { Authorization: `Bearer ${savedToken}` } })
          if (active) { setToken(savedToken); setUser(currentUser) }
        } catch {
          window.sessionStorage.removeItem(tokenKey)
        }
      }
      if (active) setReady(true)
    })()
    return () => { active = false }
  }, [])

  const acceptSession = useCallback((response: SessionResponse) => {
    window.sessionStorage.setItem(tokenKey, response.accessToken)
    setToken(response.accessToken)
    setUser(response.user)
    setError(null)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    acceptSession(await request<SessionResponse>("/login", { method: "POST", body: JSON.stringify({ email, password }) }))
  }, [acceptSession])

  const register = useCallback(async (input: { name: string; email: string; password: string; organizationName?: string; invitationToken?: string }) => {
    acceptSession(await request<SessionResponse>("/register", { method: "POST", body: JSON.stringify(input) }))
    setInvitationToken(null)
    const url = new URL(window.location.href)
    url.searchParams.delete("invite")
    window.history.replaceState({}, "", url.toString())
  }, [acceptSession])

  const logout = useCallback(() => {
    window.sessionStorage.removeItem(tokenKey)
    setToken(null)
    setUser(null)
  }, [])

  const updateOrganizationName = useCallback((name: string) => {
    setUser((current) => current ? { ...current, organizationName: name } : current)
  }, [])

  const getAccessToken = useCallback(async () => {
    if (!token) throw new Error("Inicia sesión para continuar.")
    return token
  }, [token])

  const value = useMemo<AuthContextValue>(() => ({
    ready,
    authenticated: Boolean(user && token),
    user,
    invitationToken,
    error,
    login,
    register,
    updateOrganizationName,
    logout,
    getAccessToken,
  }), [ready, user, token, invitationToken, error, login, register, updateOrganizationName, logout, getAccessToken])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error("useAuth debe usarse dentro de AuthProvider.")
  return value
}
