import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, User } from "lucide-react";

const Blog = () => {
  const posts = [
    {
      title: "10 Tips for Effective Property Management",
      excerpt: "Learn the best practices for managing rental properties efficiently and keeping tenants happy.",
      author: "Sarah Mitchell",
      date: "December 5, 2024",
      readTime: "5 min read",
      category: "Property Management"
    },
    {
      title: "How to Screen Tenants: A Complete Guide",
      excerpt: "Discover the essential steps to finding reliable tenants and avoiding costly mistakes.",
      author: "James Chen",
      date: "December 1, 2024",
      readTime: "7 min read",
      category: "Tenant Management"
    },
    {
      title: "Automating Rent Collection: Benefits and Best Practices",
      excerpt: "Explore how automation can streamline your rent collection process and improve cash flow.",
      author: "Emily Rodriguez",
      date: "November 28, 2024",
      readTime: "6 min read",
      category: "Finance"
    },
    {
      title: "Understanding Landlord-Tenant Laws in Nigeria",
      excerpt: "A comprehensive overview of the legal framework governing rental properties in Nigeria.",
      author: "Michael Brown",
      date: "November 25, 2024",
      readTime: "8 min read",
      category: "Legal"
    },
    {
      title: "Maintenance Management: Prevention vs. Reaction",
      excerpt: "Learn why preventive maintenance is crucial for protecting your property investment.",
      author: "Sarah Mitchell",
      date: "November 20, 2024",
      readTime: "5 min read",
      category: "Maintenance"
    },
    {
      title: "Growing Your Rental Portfolio: Strategies for Success",
      excerpt: "Proven strategies for scaling your rental property business sustainably.",
      author: "James Chen",
      date: "November 15, 2024",
      readTime: "6 min read",
      category: "Investment"
    }
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-primary/5 via-accent/5 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              RentFlow Blog
            </h1>
            <p className="text-xl text-muted-foreground">
              Tips, insights, and best practices for property management success
            </p>
          </div>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              {posts.map((post, idx) => (
                <Card key={idx} className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="mb-4">
                    <span className="inline-block px-3 py-1 bg-accent/10 text-accent text-sm font-medium rounded-full">
                      {post.category}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-semibold text-foreground mb-3 hover:text-accent transition-colors">
                    {post.title}
                  </h3>
                  
                  <p className="text-muted-foreground mb-4">
                    {post.excerpt}
                  </p>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{post.author}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{post.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{post.readTime}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-20 bg-accent/5">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Subscribe to Our Newsletter
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Get the latest property management tips and insights delivered to your inbox
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <Input 
                type="email" 
                placeholder="Enter your email" 
                className="flex-1"
              />
              <Button className="whitespace-nowrap">
                Subscribe
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Blog;
