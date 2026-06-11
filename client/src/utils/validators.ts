/**
 * validators.ts - 表单校验工具（Reusable validators for AppInput）
 */

export function required(msg = '不能为空') {
  return (v: string) => (v && v.trim() ? '' : msg)
}

export function minLength(min: number, msg?: string) {
  return (v: string) => (v.trim().length >= min ? '' : (msg || `至少 ${min} 个字符`))
}

export function maxLength(max: number, msg?: string) {
  return (v: string) => (v.trim().length <= max ? '' : (msg || `最多 ${max} 个字符`))
}

export function lengthBetween(min: number, max: number) {
  return (v: string) => {
    const len = v.trim().length
    if (len < min) return `至少 ${min} 个字符`
    if (len > max) return `最多 ${max} 个字符`
    return ''
  }
}

export function username() {
  return (v: string) => {
    if (!v || !v.trim()) return ''
    if (v.length < 3 || v.length > 20) return '用户名需要 3-20 个字符'
    if (!/^[a-zA-Z0-9_]+$/.test(v)) return '只能使用字母、数字和下划线'
    return ''
  }
}

export function password() {
  return (v: string) => {
    if (!v) return ''
    if (v.length < 6 || v.length > 30) return '密码需要 6-30 个字符'
    if (!/[a-zA-Z]/.test(v) || !/\d/.test(v)) return '密码需要包含字母和数字'
    return ''
  }
}

export function sameAs(target: string, msg = '两次输入不一致') {
  return (v: string) => (v === target ? '' : msg)
}

export function runValidators(v: string, rules: Array<(v: string) => string>): string {
  for (const rule of rules) {
    const err = rule(v)
    if (err) return err
  }
  return ''
}
