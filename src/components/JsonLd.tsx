export function JsonLd({ data }: { data: unknown }) {
  // JSON.stringify escapes quotes; also escape "<" so content can't close the script tag
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
