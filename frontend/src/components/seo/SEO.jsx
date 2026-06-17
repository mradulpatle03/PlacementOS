import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'PlacementOS';
const SITE_URL  = 'https://placementos.example.edu'; // update with real domain
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

/**
 * <SEO title="Success Stories" description="..." path="/success-stories" />
 *
 * Renders page-specific <title>, meta description, canonical link,
 * and OG/Twitter overrides. Falls back to site defaults when omitted.
 */
export const SEO=({
  title,
  description,
  path = '',
  image = DEFAULT_IMAGE,
  noindex = false,
}) =>{
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Campus Placement Management Platform`;
  const url = `${SITE_URL}${path}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}