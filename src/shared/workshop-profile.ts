export const WORKSHOP_PROFILE = {
  name: 'Loja do Alemão',
  document: null as string | null,
  phone: '35984737340',
  email: 'alemao1.8@hotmail.com',
  address: 'Praça Coronel José Vieira, 122',
  city: 'Paraisópolis',
  state: 'MG',
  zipCode: null as string | null,
}

export function isPlaceholderWorkshop(workshop: {
  name: string
  email?: string | null
  phone?: string | null
  city?: string | null
  address?: string | null
}) {
  return (
    !workshop.address
    || workshop.email === 'contato@celularprime.com'
    || workshop.phone === '1133334444'
    || workshop.city === 'São Paulo'
    || workshop.name === 'Loja do Alemão Celulares'
  )
}
