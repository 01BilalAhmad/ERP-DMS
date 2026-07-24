'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Building2, ShieldCheck } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function LoginScreen() {
  const [email, setEmail] = useState('admin@erp.local')
  const [password, setPassword] = useState('admin123')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (res?.error) {
      toast({ title: 'Login Failed', description: 'Invalid email or password', variant: 'destructive' })
    } else {
      toast({ title: 'Welcome back!', description: 'Loading your ERP dashboard...' })
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-emerald-950">
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600 text-white mb-4 shadow-lg shadow-emerald-600/30">
              <Building2 className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Distribution ERP</h1>
            <p className="text-muted-foreground mt-1">Multi-Company Sales & Distribution System</p>
          </div>

          <Card className="shadow-xl border-emerald-100 dark:border-emerald-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" /> Sign In
              </CardTitle>
              <CardDescription>Enter your credentials to access the dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
                </div>
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
                </Button>
              </form>
              <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 text-xs text-emerald-800 dark:text-emerald-300">
                <p className="font-semibold mb-1">Demo Credentials:</p>
                <p>Admin: <code className="font-mono">admin@erp.local</code> / <code className="font-mono">admin123</code></p>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Distribution ERP · 4 Companies · 1200 Shops · 9 Order Bookers · Sales Tax + Filer/Non-Filer Tax
          </p>
        </div>
      </main>
      <footer className="border-t bg-white/60 dark:bg-zinc-950/60 backdrop-blur py-3 text-center text-xs text-muted-foreground">
        Distribution ERP &copy; {new Date().getFullYear()} · Built with Next.js 16
      </footer>
    </div>
  )
}
