import { publicAsset } from '../lib/assets'

type BrandLogoProps = {
  className?: string
}

export function BrandLogo({ className = 'brand-logo' }: BrandLogoProps) {
  return (
    <img
      src={publicAsset('logo.jpg')}
      alt="Loja do Alemão"
      className={className}
    />
  )
}
