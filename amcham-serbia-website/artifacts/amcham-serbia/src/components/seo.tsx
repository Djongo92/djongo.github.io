import { useEffect } from 'react';
import { useI18n } from '@/lib/i18n';

interface SEOProps {
  title: string;
  description: string;
}

export function SEO({ title, description }: SEOProps) {
  const { lang } = useI18n();

  useEffect(() => {
    document.title = `${title} | AmCham Serbia`;
    
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description);
  }, [title, description, lang]);

  return null;
}
