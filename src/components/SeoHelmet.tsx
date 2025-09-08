// src/components/SeoHelmet.tsx
import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SeoHelmetProps {
  title: string;
  description: string;
  canonicalUrl?: string;
  ogType?: string; // e.g., 'website', 'article', 'profile', 'product'
  ogImage?: string;
  ogUrl?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  twitterImage?: string;
  jsonLd?: Record<string, any>;
  siteName?: string;
}

const SeoHelmet: React.FC<SeoHelmetProps> = ({
  title,
  description,
  canonicalUrl,
  ogType = 'website',
  ogImage,
  ogUrl,
  twitterCard = 'summary_large_image',
  twitterImage,
  jsonLd,
  siteName = "ArtFlow App", // Default site name
}) => {
  const currentUrl = ogUrl || window.location.href;
  const defaultOgImage = `${window.location.origin}/default-share-image.jpg`; // Ensure you have a default image at your root

  return (
    <Helmet>
      {/* Primary SEO Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Open Graph / Facebook / LinkedIn */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:image" content={ogImage || defaultOgImage} />
      <meta property="og:image:alt" content={title} /> {/* Important for accessibility and SEO */}
      {ogImage && <meta property="og:image:width" content="1200" />} {/* Optimal size for large image */}
      {ogImage && <meta property="og:image:height" content="630" />} {/* Optimal size for large image */}


      {/* Twitter Card Tags */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={twitterImage || ogImage || defaultOgImage} />
      <meta name="twitter:url" content={currentUrl} />

      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
};

export default SeoHelmet;