import { useState } from 'react'
import { Mail, Lock, User, Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Modo = 'login' | 'cadastro'

function validarSenha(senha: string): string | null {
  if (senha.length < 8)     return 'Mínimo 8 caracteres.'
  if (!/[A-Z]/.test(senha)) return 'Pelo menos uma letra maiúscula.'
  if (!/[0-9]/.test(senha)) return 'Pelo menos um número.'
  return null
}

const ERROS: Record<string, string> = {
  'Invalid login credentials':                'E-mail ou senha incorretos.',
  'Email not confirmed':                      'Confirme seu e-mail antes de entrar.',
  'User already registered':                  'Este e-mail já está cadastrado.',
  'Password should be at least 6 characters': 'A senha precisa ter pelo menos 6 caracteres.',
  'over_request_rate_limit':                  'Muitas tentativas. Aguarde alguns minutos.',
}

export function Auth() {
  const [modo, setModo] = useState<Modo>('login')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [username, setUsername] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)

  function trocarModo(novoModo: Modo) {
    setModo(novoModo)
    setErro(null)
    setSucesso(null)
    setSenha('')
    setConfirmarSenha('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setSucesso(null)

    if (modo === 'cadastro') {
      if (username.trim().length < 3) {
        setErro('Nome de usuário precisa ter pelo menos 3 caracteres.')
        return
      }
      if (!/^[a-z0-9_]+$/i.test(username.trim())) {
        setErro('Só letras, números e _ no nome de usuário.')
        return
      }
      const erroSenha = validarSenha(senha)
      if (erroSenha) { setErro(erroSenha); return }
      if (senha !== confirmarSenha) {
        setErro('As senhas não coincidem.')
        return
      }
    }

    setLoading(true)
    try {
      if (modo === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password: senha,
          options: { data: { username: username.trim().toLowerCase(), display_name: username.trim() } },
        })
        if (error) throw error
        setSucesso('Conta criada! Verifique seu e-mail para ativar o acesso.')
      }
    } catch (err: any) {
      setErro(ERROS[err.message] ?? err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="relative flex min-h-screen flex-col bg-[#0f0f13]"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-0 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#6366f1]/12 blur-[100px]" />
      </div>

      <div className="relative flex flex-1 flex-col px-7">

        <div className="flex flex-col items-center justify-center pt-20 pb-14">
          <h1
            className="text-5xl font-semibold text-[#f1f1f3]"
            style={{
              fontFamily: "'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif",
              letterSpacing: '-1px',
            }}
          >
            MovieTake
          </h1>
          <p className="mt-2 text-sm text-[#5a5a72]">
            {modo === 'login' ? 'Bem-vindo de volta.' : 'Comece sua jornada.'}
          </p>
        </div>

        <form
          id="auth-form"
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-5"
        >
          {modo === 'cadastro' && (
            <Campo icon={<User size={17} />} placeholder="Nome de usuário" type="text"
              value={username} onChange={setUsername} autoComplete="username" />
          )}

          <Campo icon={<Mail size={17} />} placeholder="E-mail" type="email"
            value={email} onChange={setEmail} autoComplete="email" />

          <Campo
            icon={<Lock size={17} />}
            placeholder="Senha"
            type={mostrarSenha ? 'text' : 'password'}
            value={senha}
            onChange={setSenha}
            autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
            sufixo={
              <button type="button" onClick={() => setMostrarSenha(v => !v)}
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                className="text-[#5a5a72] hover:text-[#9898ac] transition-colors"
              >
                {mostrarSenha ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
              </button>
            }
          />

          {modo === 'cadastro' && (
            <Campo icon={<Lock size={17} />} placeholder="Confirmar senha"
              type={mostrarSenha ? 'text' : 'password'}
              value={confirmarSenha} onChange={setConfirmarSenha} autoComplete="new-password" />
          )}

          {/* idnicadores da senha */}
          {modo === 'cadastro' && senha.length > 0 && (
            <div className="flex gap-4">
              <Req ok={senha.length >= 8}     label="8+ chars" />
              <Req ok={/[A-Z]/.test(senha)}   label="Maiúscula" />
              <Req ok={/[0-9]/.test(senha)}   label="Número" />
            </div>
          )}

          {modo === 'login' && (
            <div className="text-right -mt-2">
              <button type="button"
                className="text-xs text-[#5a5a72] hover:text-[#9898ac] transition-colors"
                onClick={() => {/* TODO */ }}
              >
                Esqueci minha senha
              </button>
            </div>
          )}

         {erro && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-red-500/15 bg-red-500/8 px-4 py-3">
              <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-400" aria-hidden="true" />
              <p className="text-xs leading-relaxed text-red-400">{erro}</p>
            </div>
          )}
          {sucesso && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-green-500/15 bg-green-500/8 px-4 py-3">
              <CheckCircle size={14} className="mt-0.5 shrink-0 text-green-400" aria-hidden="true" />
              <p className="text-xs leading-relaxed text-green-400">{sucesso}</p>
            </div>
          )}
        </form>

        <div className="mt-auto flex flex-col gap-4 pb-10 pt-8">
          <button
            type="submit"
            form="auth-form"
            disabled={loading}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#6366f1] text-base font-semibold text-white shadow-lg shadow-[#6366f1]/20 transition-all hover:bg-[#7577f3] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {loading
              ? <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              : modo === 'login' ? 'Entrar' : 'Criar conta'
            }
          </button>

          <p className="text-center text-sm text-[#5a5a72]">
            {modo === 'login' ? 'Não tem uma conta?' : 'Já tem uma conta?'}{' '}
            <button
              type="button"
              onClick={() => trocarModo(modo === 'login' ? 'cadastro' : 'login')}
              className="font-semibold text-[#f1f1f3] transition-colors hover:text-[#6366f1]"
            >
              {modo === 'login' ? 'Criar conta' : 'Entrar'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
function Campo({ icon, placeholder, type, value, onChange, autoComplete, sufixo }: {
  icon: React.ReactNode
  placeholder: string
  type: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
  sufixo?: React.ReactNode
}) {
  return (
    <div className="group flex items-center gap-3 border-b border-[#2a2a38] pb-3.5 transition-colors focus-within:border-[#6366f1]">
      <span className="shrink-0 text-[#3a3a50] transition-colors group-focus-within:text-[#6366f1]" aria-hidden="true">
        {icon}
      </span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="flex-1 bg-transparent text-base text-[#f1f1f3] placeholder-[#3a3a50] outline-none"
      />
      {sufixo}
    </div>
  )
}

function Req({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${ok ? 'text-green-400' : 'text-[#3a3a50]'}`}>
      <span className={`h-1 w-1 rounded-full transition-colors ${ok ? 'bg-green-400' : 'bg-[#3a3a50]'}`} aria-hidden="true" />
      {label}
    </span>
  )
}
