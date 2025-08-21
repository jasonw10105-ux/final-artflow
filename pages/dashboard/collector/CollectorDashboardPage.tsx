import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Database } from '@/types/supabase';
import { Link } from 'react-router-dom';

type Artwork = Database['public']['Tables']['artworks']['Row'];

const CollectorDashboardPage: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
          // Public recommendations if not logged in
          const { data, error } = await supabase
            .from('artworks')
            .select('*')
            .eq('status', 'Active')
            .limit(10);
          
          if (error) setError(error.message);
          else setRecommendations(data || []);
      } else {
          // Personalized recommendations if logged in
          const { data, error } = await supabase.rpc('get_artwork_recommendations', {
              p_viewer_id: user.id,
              p_limit: 10,
          });

          if (error) setError(error.message);
          else setRecommendations(data || []);
      }
      setLoading(false);
    };

    fetchRecommendations();
  }, []);

  if (loading) {
    return <div>Finding recommendations for you...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Collector Dashboard</h1>
      <h2>Recommended for You</h2>
      {recommendations.length > 0 ? (
        <div>
          {recommendations.map((rec) => (
            <div key={rec.id}>
              <Link to={`/artwork/${rec.slug}`}>
                <h3>{rec.title}</h3>
                {rec.image_url && <img src={rec.image_url} alt={rec.title || ''} width="200" />}
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <p>No recommendations available at this time.</p>
      )}
    </div>
  );
};

export default CollectorDashboardPage;
