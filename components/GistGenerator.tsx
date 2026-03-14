interface GistGeneratorProps {
  gist: string;
}

export default function GistGenerator({ gist }: GistGeneratorProps) {
  return (
    <section className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <h4 className="text-base font-semibold text-gray-900 mb-3">AI Meeting GIST Generator</h4>
      <p className="text-sm text-gray-700 leading-relaxed">{gist}</p>
    </section>
  );
}
