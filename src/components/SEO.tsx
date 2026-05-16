import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description?: string;
  canonical?: string;
  image?: string;
  type?: 'website' | 'article';
  jsonLd?: object | object[];
  noIndex?: boolean;
}

const SITE_NAME = 'Footprints Dynasty';
const DEFAULT_IMAGE =
  'https://storage.googleapis.com/gpt-engineer-file-uploads/kmOcriGVCASRpCwAFyZIO8lwyL83/social-images/social-1759471341762-fdl logo rec.jpg';

export const SEO = ({
  title,
  description,
  canonical,
  image,
  type = 'website',
  jsonLd,
  noIndex,
}: SEOProps) => {
  const fullTitle = title.length > 60 ? title.slice(0, 57) + '...' : title;
  const desc = description ? description.slice(0, 160) : undefined;
  const url =
    canonical ||
    (typeof window !== 'undefined' ? window.location.href : undefined);
  const img = image || DEFAULT_IMAGE;
  const ldArray = jsonLd
    ? Array.isArray(jsonLd)
      ? jsonLd
      : [jsonLd]
    : [];

  return (
    <Helmet>
      <title>{fullTitle} | {SITE_NAME}</title>
      {desc && <meta name="description" content={desc} />}
      {url && <link rel="canonical" href={url} />}
      {noIndex && <meta name="robots" content="noindex,nofollow" />}

      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      {desc && <meta property="og:description" content={desc} />}
      {url && <meta property="og:url" content={url} />}
      <meta property="og:image" content={img} />
      <meta property="og:site_name" content={SITE_NAME} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {desc && <meta name="twitter:description" content={desc} />}
      <meta name="twitter:image" content={img} />

      {ldArray.map((ld, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(ld)}
        </script>
      ))}
    </Helmet>
  );
};

export default SEO;
