import { supabase, TrainingSample } from '../lib/supabase';

export const trainingService = {
  async saveTrainingSample(
    sampleType: 'query' | 'sigma_rule' | 'log_snippet',
    content: string,
    description?: string
  ): Promise<TrainingSample | null> {
    const { data, error } = await supabase
      .from('training_samples')
      .insert({
        sample_type: sampleType,
        content: content.trim(),
        description: description?.trim() || null,
        session_id: getSessionId()
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving training sample:', error);
      throw new Error(`Failed to save training sample: ${error.message}`);
    }

    return data;
  },

  async getAllTrainingSamples(): Promise<TrainingSample[]> {
    const { data, error } = await supabase
      .from('training_samples')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching training samples:', error);
      return [];
    }

    return data || [];
  },

  async getTrainingSamplesByType(type: 'query' | 'sigma_rule' | 'log_snippet'): Promise<TrainingSample[]> {
    const { data, error } = await supabase
      .from('training_samples')
      .select('*')
      .eq('sample_type', type)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching training samples by type:', error);
      return [];
    }

    return data || [];
  },

  async deleteTrainingSample(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('training_samples')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting training sample:', error);
      return false;
    }

    return true;
  }
};

function getSessionId(): string {
  let sessionId = localStorage.getItem('aql_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('aql_session_id', sessionId);
  }
  return sessionId;
}
