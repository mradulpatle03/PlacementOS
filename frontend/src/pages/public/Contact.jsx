import { useState } from "react";
import { Mail, Phone, MapPin, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import SEO from "@/components/seo/SEO";

const CONTACT_INFO = [
  {
    icon: Mail,
    label: "Email",
    value: "tpo@college.edu",
    href: "mailto:tpo@college.edu",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+91 98765 43210",
    href: "tel:+919876543210",
  },
  {
    icon: MapPin,
    label: "Address",
    value: "Placement Cell, Main Building, College Campus",
    href: null,
  },
];

export default function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "student",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    // open mail client with pre-filled content — no backend dependency
    const subject = encodeURIComponent(
      form.subject || `Inquiry from ${form.name}`,
    );
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\nRole: ${form.role}\n\n${form.message}`,
    );
    window.location.href = `mailto:tpo@college.edu?subject=${subject}&body=${body}`;

    setSubmitted(true);
    toast.success("Opening your mail client…");
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
      <SEO
        path="/contact"
        title="Contact Us"
        description="Have a question about placements? Reach out to the PlacementOS team."
      />
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold">Contact Us</h1>
        <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
          Have a question about placements? Reach out to our team — we're happy
          to help.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* contact info sidebar */}
        <div className="space-y-4">
          {CONTACT_INFO.map((item) => {
            const Icon = item.icon;
            const content = (
              <Card
                key={item.label}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="pt-5 pb-5 flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="text-sm font-medium mt-0.5">{item.value}</p>
                  </div>
                </CardContent>
              </Card>
            );
            return item.href ? (
              <a key={item.label} href={item.href} className="block">
                {content}
              </a>
            ) : (
              content
            );
          })}
        </div>

        {/* contact form */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="pt-6 pb-6">
              {submitted ? (
                <div className="flex flex-col items-center justify-center text-center py-12 gap-3">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  <p className="font-semibold">Thanks for reaching out!</p>
                  <p className="text-sm text-muted-foreground">
                    Your mail client should have opened with your message. We'll
                    get back to you soon.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSubmitted(false)}
                  >
                    Send another message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                        Name <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => set("name", e.target.value)}
                        className="w-full h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="Your full name"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                        Email <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => set("email", e.target.value)}
                        className="w-full h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                      I am a…
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {["student", "recruiter", "faculty", "other"].map(
                        (role) => (
                          <button
                            key={role}
                            type="button"
                            onClick={() => set("role", role)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border capitalize transition-colors ${
                              form.role === role
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-border text-muted-foreground hover:border-primary/40"
                            }`}
                          >
                            {role}
                          </button>
                        ),
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={form.subject}
                      onChange={(e) => set("subject", e.target.value)}
                      className="w-full h-10 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="What's this about?"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                      Message <span className="text-destructive">*</span>
                    </label>
                    <textarea
                      rows={5}
                      value={form.message}
                      onChange={(e) => set("message", e.target.value)}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                      placeholder="Tell us how we can help…"
                    />
                  </div>

                  <Button type="submit" className="w-full gap-2">
                    <Send className="w-4 h-4" />
                    Send Message
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
