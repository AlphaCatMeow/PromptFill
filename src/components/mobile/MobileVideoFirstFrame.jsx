import React, { useState, useEffect, useRef } from 'react';
import { useResolvedFolderMediaSrc } from '../../context/FolderStorageContext';

/**
 * 移动端专用：当视频模板没有 imageUrl 时，用视频第一帧作为预览图。
 * 仅在进入视口后再拉取视频，避免瀑布流首屏把所有视频都请求一遍。
 */
export const MobileVideoFirstFrame = React.memo(({
  videoUrl,
  alt,
  className = '',
  aspectRatio = '16 / 9',
}) => {
  const { displaySrc: resolvedVideo, failed: resolveFailed, loading: resolveLoading } = useResolvedFolderMediaSrc(videoUrl || '');
  const [posterDataUrl, setPosterDataUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (shouldLoad) return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '160px', threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldLoad]);

  useEffect(() => {
    if (!shouldLoad || !resolvedVideo || resolveLoading || resolveFailed || typeof document === 'undefined') return;

    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.crossOrigin = 'anonymous';
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');

    const onLoadedData = () => {
      video.currentTime = 0.1;
    };

    const onSeeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setFailed(true);
          return;
        }
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPosterDataUrl(dataUrl);
      } catch (e) {
        setFailed(true);
      }
    };

    const onError = () => setFailed(true);

    video.addEventListener('loadeddata', onLoadedData);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);

    video.src = resolvedVideo;
    video.load();

    return () => {
      video.removeEventListener('loadeddata', onLoadedData);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      video.src = '';
      video.load();
    };
  }, [shouldLoad, resolvedVideo, resolveLoading, resolveFailed]);

  if (posterDataUrl) {
    return (
      <div ref={containerRef} className="relative w-full overflow-hidden">
        <img
          src={posterDataUrl}
          alt={alt}
          className={`w-full h-auto block ${className}`}
          decoding="async"
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`w-full bg-gray-200/50 flex items-center justify-center image-placeholder-breathe ${className}`}
      style={{ aspectRatio }}
    >
      {failed || resolveFailed ? (
        <span className="text-[10px] text-gray-400">预览不可用</span>
      ) : (
        <span className="image-placeholder-label text-black">loading</span>
      )}
    </div>
  );
});
MobileVideoFirstFrame.displayName = 'MobileVideoFirstFrame';
