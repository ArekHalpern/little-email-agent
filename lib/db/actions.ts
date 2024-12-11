import { prisma } from './prisma'

export async function getCustomerByAuthId(authUserId: string) {
  return await prisma.customer.findUnique({
    where: { auth_user_id: authUserId }
  })
}

export async function createCustomer(data: { 
  authUserId: string, 
  email: string, 
  name?: string 
}) {
  return await prisma.customer.create({
    data: {
      auth_user_id: data.authUserId,
      email: data.email,
      name: data.name
    }
  })
}
