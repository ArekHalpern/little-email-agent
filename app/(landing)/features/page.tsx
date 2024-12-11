import React from "react";

const features = [
  {
    title: "Real-time Collaboration",
    description: "Work together seamlessly with your team in real-time",
    icon: "🚀",
  },
  {
    title: "Advanced Analytics",
    description: "Get deep insights into your project metrics",
    icon: "📊",
  },
  {
    title: "AI-Powered Suggestions",
    description: "Let AI help you make better decisions",
    icon: "🤖",
  },
  {
    title: "Enterprise Security",
    description: "Bank-grade security for your sensitive data",
    icon: "🔒",
  },
];

export default function FeaturesPage() {
  return (
    <div className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Everything you need to succeed
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Powerful features to help you take control of your projects
          </p>
        </div>
        <div className="mt-20 grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div key={feature.title} className="relative">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-lg font-medium text-gray-900">
                {feature.title}
              </h3>
              <p className="mt-2 text-base text-gray-500">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
