// Typed supabase client wrapper to handle schema sync delays
// The auto-generated types.ts may lag behind migrations.
// Use `db` for .from() calls until types catch up.
import { supabase } from '@/integrations/supabase/client';

export const db = supabase as any;
