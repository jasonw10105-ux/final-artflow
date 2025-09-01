import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

interface Artwork {
  id: string;
  edition_info?: {
    is_edition?: boolean;
    numeric_size?: number;
    ap_size?: number;
    sold_editions?: string[];
  };
}

const updateSaleStatus = async ({
  artworkId,
  identifier,
  isSold,
}: {
  artworkId: string;
  identifier: string;
  isSold: boolean;
}) => {
  const { error } = await supabase.rpc('update_artwork_edition_sale', {
    p_artwork_id: artworkId,
    p_edition_identifier: identifier,
    p_is_sold: isSold,
  });
  if (error) throw error;
};

export const useEditionManagement = (artwork: Artwork, artworkId: string) => {
  const queryClient = useQueryClient();

  const saleMutation = useMutation({
    mutationFn: updateSaleStatus,
    onSuccess: () => {
      queryClient.invalidateQueries(['artwork-editor-data', artworkId]);
      queryClient.invalidateQueries(['artworks']);
    },
    onError: (error: any) => alert(`Error updating sale: ${error.message}`),
  });

  const allEditions = useMemo(() => {
    const editionInfo = artwork.edition_info;
    if (!editionInfo?.is_edition) return [];
    const editions: string[] = [];
    const numericSize = editionInfo.numeric_size || 0;
    const apSize = editionInfo.ap_size || 0;
    for (let i = 1; i <= numericSize; i++) editions.push(`${i}/${numericSize}`);
    for (let i = 1; i <= apSize; i++) editions.push(`AP ${i}/${apSize}`);
    return editions;
  }, [artwork.edition_info]);

  const handleEditionSaleChange = (identifier: string, isChecked: boolean) => {
    saleMutation.mutate({ artworkId, identifier, isSold: isChecked });
  };

  return { saleMutation, handleEditionSaleChange, allEditions };
};