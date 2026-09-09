export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export function isValidCPF(value: string): boolean {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false
  const calc = (base: number) => {
    let sum = 0
    for (let i = 0; i < base; i += 1) sum += Number(cpf[i]) * (base + 1 - i)
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10])
}

export function isValidCNPJ(value: string): boolean {
  const cnpj = onlyDigits(value)
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false
  const calc = (len: number) => {
    const weights = len === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const sum = weights.reduce((acc, weight, index) => acc + Number(cnpj[index]) * weight, 0)
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13])
}

export function isValidDocument(value: string): boolean {
  const digits = onlyDigits(value)
  if (digits.length === 11) return isValidCPF(digits)
  if (digits.length === 14) return isValidCNPJ(digits)
  return false
}

export function documentTypeOf(value: string): 'CPF' | 'CNPJ' {
  return onlyDigits(value).length === 14 ? 'CNPJ' : 'CPF'
}

export function isValidPhone(value: string): boolean {
  const digits = onlyDigits(value)
  return digits.length === 10 || digits.length === 11
}

export function isValidImei(value: string): boolean {
  const digits = onlyDigits(value)
  if (digits.length !== 15) return false
  let sum = 0
  for (let i = 0; i < 14; i += 1) {
    let n = Number(digits[i])
    if (i % 2 === 1) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
  }
  return (10 - (sum % 10)) % 10 === Number(digits[14])
}

export function isValidPlate(value: string): boolean {
  return isValidImei(value)
}

export function makeValidImei(base: string) {
  const digits = onlyDigits(base).padEnd(14, '0').slice(0, 14)
  let sum = 0
  for (let i = 0; i < 14; i += 1) {
    let n = Number(digits[i])
    if (i % 2 === 1) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
  }
  return digits + String((10 - (sum % 10)) % 10)
}

export function makeValidCpf(base: string) {
  const digits = onlyDigits(base).padEnd(9, '0').slice(0, 9)
  const calc = (value: string, baseLen: number) => {
    let sum = 0
    for (let i = 0; i < baseLen; i += 1) sum += Number(value[i]) * (baseLen + 1 - i)
    const rest = (sum * 10) % 11
    return String(rest === 10 ? 0 : rest)
  }
  const d1 = calc(digits, 9)
  const d2 = calc(digits + d1, 10)
  return digits + d1 + d2
}

export function normalizePlate(value: string): string {
  const digits = onlyDigits(value)
  return digits.length === 15 ? digits : value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function formatDocument(value: string): string {
  const digits = onlyDigits(value)
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }
  return value
}

export function formatPhone(value: string): string {
  const digits = onlyDigits(value)
  if (digits.length === 11) return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  if (digits.length === 10) return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  return value
}

export function formatPlate(value: string): string {
  const plate = normalizePlate(value)
  if (plate.length === 15) return `${plate.slice(0, 8)} ${plate.slice(8)}`
  if (plate.length === 7) return `${plate.slice(0, 3)}-${plate.slice(3)}`
  return plate
}
