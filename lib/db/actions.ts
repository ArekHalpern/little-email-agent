import { prisma } from './prisma'
import { randomUUID } from 'crypto'
import templatesJson from './templates.json'
import { google } from 'googleapis'

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

export async function getGmailClient(userId: string) {
  const customer = await prisma.customer.findUnique({
    where: { auth_user_id: userId },
    select: {
      id: true,
      google_access_token: true,
      google_refresh_token: true,
      google_token_expiry: true
    }
  });

  if (!customer?.google_access_token) {
    throw new Error('Gmail not connected')
  }

  // Check if token expires in next 5 minutes
  if (customer.google_token_expiry) {
    const expiresIn = customer.google_token_expiry.getTime() - Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (expiresIn < fiveMinutes) {
      const oauth2Client = new google.auth.OAuth2(
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
      );

      oauth2Client.setCredentials({
        refresh_token: customer.google_refresh_token || undefined
      });

      const { credentials } = await oauth2Client.refreshAccessToken();
      
      await updateCustomerGoogleTokens(customer.id, {
        accessToken: credentials.access_token!,
        refreshToken: credentials.refresh_token || undefined,
        expiryDate: credentials.expiry_date ? new Date(credentials.expiry_date) : undefined
      });

      const newOAuth2Client = new google.auth.OAuth2(
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
      );

      newOAuth2Client.setCredentials({
        access_token: credentials.access_token,
        refresh_token: customer.google_refresh_token || undefined,
        expiry_date: credentials.expiry_date
      });

      return google.gmail({ 
        version: 'v1', 
        auth: newOAuth2Client
      });
    }
  }

  // Use existing token
  const oauth2Client = new google.auth.OAuth2(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
  );

  oauth2Client.setCredentials({
    access_token: customer.google_access_token,
    refresh_token: customer.google_refresh_token || undefined,
    expiry_date: customer.google_token_expiry?.getTime()
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}
