import React from "react";

const tiers = [
  {
    name: "Starter",
    price: 0,
    features: ["5 Projects", "Basic Analytics", "24/7 Support"],
    cta: "Start for free",
  },
  {
    name: "Pro",
    price: 29,
    features: [
      "Unlimited Projects",
      "Advanced Analytics",
      "Priority Support",
      "Custom Domains",
    ],
    cta: "Start free trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: 99,
    features: [
      "Everything in Pro",
      "SSO Authentication",
      "Dedicated Support",
      "Custom Contracts",
    ],
    cta: "Contact sales",
  },
];

export default function PricingPage() {
  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base font-semibold leading-7 text-indigo-600">
            Pricing
          </h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Choose the right plan for you
          </p>
        </div>
        <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-3xl p-8 ring-1 ring-gray-200 ${
                tier.highlighted
                  ? "bg-gray-900 text-white ring-gray-900"
                  : "bg-white"
              }`}
            >
              <h3 className="text-lg font-semibold">{tier.name}</h3>
              <p className="mt-4 flex items-baseline gap-x-2">
                <span className="text-4xl font-bold tracking-tight">
                  ${tier.price}
                </span>
                <span className="text-sm font-semibold">/month</span>
              </p>
              <ul className="mt-8 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex gap-x-3">
                    <svg
                      className={`h-6 w-5 flex-none ${
                        tier.highlighted ? "text-indigo-400" : "text-indigo-600"
                      }`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                className={`mt-8 block w-full rounded-md px-3 py-2 text-center text-sm font-semibold shadow-sm ${
                  tier.highlighted
                    ? "bg-indigo-500 text-white hover:bg-indigo-400"
                    : "bg-indigo-600 text-white hover:bg-indigo-500"
                }`}
              >
                {tier.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
