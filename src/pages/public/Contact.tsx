import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Phone, MapPin } from 'lucide-react';
import PublicLayout from '@/components/PublicLayout';
import { db } from '@/lib/supabase-db';
import { toast } from 'sonner';

const Contact = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill in all required fields');
      return;
    }
    setLoading(true);
    const { error } = await db.from('contact_submissions').insert([form]);
    setLoading(false);
    if (error) {
      toast.error('Failed to submit. Please try again.');
    } else {
      toast.success('Message sent successfully!');
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    }
  };

  return (
    <PublicLayout>
      <section className="bg-[hsl(214,95%,15%)] py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Contact Us</h1>
          <p className="text-[hsl(0,0%,75%)] text-lg">We'd love to hear from you</p>
        </div>
      </section>
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Info */}
          <div className="space-y-6">
            <Card><CardContent className="p-5 flex items-start gap-4">
              <Mail className="h-5 w-5 text-[hsl(28,100%,55%)] mt-0.5 shrink-0" />
              <div><h4 className="font-semibold text-[hsl(214,95%,15%)]">Email</h4><p className="text-sm text-[hsl(210,15%,40%)]">info@footprintsdynasty.com.ng</p></div>
            </CardContent></Card>
            <Card><CardContent className="p-5 flex items-start gap-4">
              <Phone className="h-5 w-5 text-[hsl(28,100%,55%)] mt-0.5 shrink-0" />
              <div><h4 className="font-semibold text-[hsl(214,95%,15%)]">Phone</h4><p className="text-sm text-[hsl(210,15%,40%)]">Contact via email</p></div>
            </CardContent></Card>
            <Card><CardContent className="p-5 flex items-start gap-4">
              <MapPin className="h-5 w-5 text-[hsl(28,100%,55%)] mt-0.5 shrink-0" />
              <div><h4 className="font-semibold text-[hsl(214,95%,15%)]">Registration</h4><p className="text-sm text-[hsl(210,15%,40%)]">RC: 1554073</p></div>
            </CardContent></Card>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input placeholder="Your Name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                    <Input placeholder="Your Email *" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input placeholder="Phone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                    <Input placeholder="Subject" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} />
                  </div>
                  <Textarea placeholder="Your Message *" rows={5} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} />
                  <Button type="submit" disabled={loading} className="bg-[hsl(28,100%,55%)] hover:bg-[hsl(28,100%,45%)] text-white w-full sm:w-auto">
                    {loading ? 'Sending...' : 'Send Message'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default Contact;
