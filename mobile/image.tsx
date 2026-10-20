import type { ImgHTMLAttributes } from 'react';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string | { src: string; width?: number; height?: number };
  alt: string;
  fill?: boolean;
  priority?: boolean;
  unoptimized?: boolean;
  quality?: number;
};

export default function MobileImage({ src, fill, priority, unoptimized: _unoptimized, quality: _quality, style, ...props }: Props) {
  return <img {...props}
    src={typeof src === 'string' ? src : src.src}
    loading={priority ? 'eager' : (props.loading ?? 'lazy')}
    fetchPriority={priority ? 'high' : props.fetchPriority}
    decoding="async"
    style={fill ? { position: 'absolute', inset: 0, height: '100%', width: '100%', ...style } : style}
  />;
}
