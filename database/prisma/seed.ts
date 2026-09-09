import { disconnectPrisma, getPrisma } from '../../src/backend/database/client'
import { seedDatabase } from '../../src/backend/database/seed-runtime'
import '../../src/backend/database/env'

async function main() {
  getPrisma()
  await seedDatabase()
}

main()
  .then(() => disconnectPrisma())
  .catch(async (error) => {
    console.error(error)
    await disconnectPrisma()
    process.exit(1)
  })
