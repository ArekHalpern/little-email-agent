import { prisma } from './prisma'

const DEFAULT_TEMPLATES = [
  {
    name: "Email Summarizer",
    description: "Get a concise summary of long email threads",
    prompt: `You are a helpful assistant that summarizes email content clearly and concisely.
Extract and organize the following:
- Main topic/subject
- Key points
- Action items (if any)
- Important dates/deadlines
- Next steps or required responses
Present the summary in a clear, bulleted format.`,
  },
  {
    name: "Reservation Details",
    description: "Extract key details from restaurant reservation emails",
    prompt: `You are a helpful assistant that extracts restaurant reservation details from emails. 
Extract the following information if present:
- Restaurant name
- Date and time
- Number of guests
- Special requests
- Contact information
Format the response in a clear, structured way.`,
  },
];

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
        auth_user_id: data.authUserId,
        email: data.email,
        name: data.name,
      },
    });

    // Create default templates for the customer
    await Promise.all(
      DEFAULT_TEMPLATES.map((template) =>
        tx.emailPrompt.create({
          data: {
            ...template,
            customerId: customer.id,
          },
        })
      )
    );

    return customer;
  });
}
