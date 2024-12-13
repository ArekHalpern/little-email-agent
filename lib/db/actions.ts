import { prisma } from './prisma'
import { randomUUID } from 'crypto'
import templatesJson from './templates.json'

interface EmailTemplate {
  name: string;
  description: string;
  prompt: string;
}

interface Templates {
  defaultTemplates: EmailTemplate[];
}

const templates = templatesJson as Templates;

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
  // Try to find existing customer first
  const existingCustomer = await getCustomerByAuthId(data.authUserId)
  if (existingCustomer) return existingCustomer

  // Create new customer with default templates
  return await prisma.$transaction(async (tx) => {
    // Create the customer
    const customer = await tx.customer.create({
      data: {
        id: randomUUID(),
        auth_user_id: data.authUserId,
        email: data.email,
        name: data.name,
      },
    });

    // Create default templates for the customer
    await Promise.all(
      templates.defaultTemplates.map((template) =>
        tx.emailPrompt.create({
          data: {
            id: randomUUID(),
            ...template,
            customerId: customer.id,
            updatedAt: new Date(),
          },
        })
      )
    );

    return customer;
  });
}

export async function updateCustomerGoogleTokens(customerId: string, {
  accessToken,
  refreshToken,
  expiryDate
}: {
  accessToken: string;
  refreshToken?: string;
  expiryDate?: Date;
}) {
  return await prisma.customer.update({
    where: { id: customerId },
    data: {
      google_access_token: accessToken,
      ...(refreshToken && { google_refresh_token: refreshToken }),
      ...(expiryDate && { google_token_expiry: expiryDate })
    }
  });
}

export async function getCustomerGoogleTokens(customerId: string) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      google_access_token: true,
      google_refresh_token: true,
      google_token_expiry: true
    }
  });
  return customer;
}

export async function getCustomerDetails(authUserId: string) {
  const customer = await prisma.customer.findUnique({
    where: { auth_user_id: authUserId },
    select: {
      id: true,
      email: true,
      name: true,
      google_access_token: true,
      google_refresh_token: true,
      google_token_expiry: true,
      createdAt: true,
      updatedAt: true,
    }
  });
  return customer;
}
