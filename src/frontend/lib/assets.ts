export function publicAsset(file: string) {
  const base = import.meta.env.BASE_URL || './'
  return `${base}${file.replace(/^\//, '')}`
}
