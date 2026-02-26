import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import PublicLayout from '@/components/PublicLayout';
import { db } from '@/lib/supabase-db';

const Careers = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  useEffect(() => {
    db.from('job_positions').select('*').eq('status', 'open').order('created_at', { ascending: false }).then((r: any) => setJobs(r.data || []));
  }, []);

  return (
    <PublicLayout>
      <section className="bg-[hsl(214,95%,15%)] py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Careers</h1>
          <p className="text-[hsl(0,0%,75%)] text-lg">Join our team and make a difference</p>
        </div>
      </section>
      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4 space-y-4">
          {jobs.length === 0 ? (
            <p className="text-center text-[hsl(210,15%,40%)] py-8">No open positions at the moment. Check back soon!</p>
          ) : (
            jobs.map(job => (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[hsl(214,95%,15%)]">{job.title}</h3>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-[hsl(210,15%,40%)]">
                      {job.department && <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {job.department}</span>}
                      {job.work_location_state && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {job.work_location_state}</span>}
                      {job.job_type && <span className="px-2 py-0.5 rounded-full bg-[hsl(28,100%,96%)] text-[hsl(28,100%,40%)] text-xs font-medium">{job.job_type}</span>}
                    </div>
                  </div>
                  <Button asChild className="bg-[hsl(28,100%,55%)] hover:bg-[hsl(28,100%,45%)] text-white shrink-0">
                    <Link to="/apply">Apply Now</Link>
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>
    </PublicLayout>
  );
};

export default Careers;
