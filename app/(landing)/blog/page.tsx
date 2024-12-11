import React from "react";

const posts = [
  {
    title: "Introducing New AI Features",
    excerpt: "Learn about our latest AI-powered capabilities...",
    date: "Mar 16, 2024",
    readTime: "5 min read",
    image: "/blog-1.jpg",
    author: {
      name: "Sarah Johnson",
      role: "Product Manager",
      avatar: "/avatar-1.jpg",
    },
  },
  {
    title: "2024 Product Roadmap",
    excerpt: "See what we're building next...",
    date: "Mar 14, 2024",
    readTime: "8 min read",
    image: "/blog-2.jpg",
    author: {
      name: "Mike Chen",
      role: "CTO",
      avatar: "/avatar-2.jpg",
    },
  },
];

export default function BlogPage() {
  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Latest Updates
          </h2>
          <p className="mt-2 text-lg leading-8 text-gray-600">
            Learn about product updates and industry insights
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2">
          {posts.map((post) => (
            <article
              key={post.title}
              className="flex flex-col items-start justify-between"
            >
              <div className="relative w-full">
                <div className="aspect-[16/9] w-full bg-gray-100 rounded-2xl" />
              </div>
              <div className="max-w-xl">
                <div className="mt-8 flex items-center gap-x-4 text-xs">
                  <time dateTime={post.date} className="text-gray-500">
                    {post.date}
                  </time>
                  <span className="text-gray-500">{post.readTime}</span>
                </div>
                <div className="group relative">
                  <h3 className="mt-3 text-lg font-semibold leading-6 text-gray-900">
                    {post.title}
                  </h3>
                  <p className="mt-5 text-sm leading-6 text-gray-600">
                    {post.excerpt}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
