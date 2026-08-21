import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, memo } from 'react';
import { useResolvedFolderMediaSrc } from '../context/FolderStorageContext';

/**
 * OptimizedImage - 可见区域才请求真实 URL。
 *
 * 瀑布流必须传入 aspectRatio：加载前按该比例占位，避免高度为 0 时
 * 所有卡片挤进视口、浏览器一次性请求全部图片。
 * 图片解码完成后取消锁定，按原始宽高显示，不再裁切。
 * 其它场景（灯箱、编辑器）不传 aspectRatio，保持原有 img 布局。
 *
 * priority <= 2：立即加载。不要再用 new Image() 预热，否则会双倍请求。
 */
const OptimizedImage = memo(({
  src,
  alt = '',
  className = '',
  style = {},
  priority = 10,
  rootMargin = '160px',
  rootRef = null,
  aspectRatio,
  onLoad,
  onError,
  referrerPolicy = 'no-referrer',
  isDarkMode = false,
  nativeLazy: _nativeLazy = false,
  ...props
}) => {
  const { displaySrc, failed: folderFailed, loading: folderLoading } = useResolvedFolderMediaSrc(src);
  const eager = priority <= 2;
  const [shouldLoad, setShouldLoad] = useState(eager);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef(null);
  const imgRef = useRef(null);

  const effectiveSrc = displaySrc;
  const placeholderBg = isDarkMode ? '#2A2726' : '#e5e7eb';
  const placeholderLabelClass = isDarkMode ? 'text-white' : 'text-black';

  const PlaceholderMark = (
    <span className={`image-placeholder-label ${placeholderLabelClass}`}>loading</span>
  );

  const PlaceholderFill = (
    <>
      <div
        className="absolute inset-0 pointer-events-none image-placeholder-breathe"
        style={{ backgroundColor: placeholderBg }}
        aria-hidden
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {PlaceholderMark}
      </div>
    </>
  );

  useLayoutEffect(() => {
    setHasError(false);
    setShouldLoad(eager);
    if (!effectiveSrc || folderFailed || folderLoading) {
      setIsLoaded(false);
      return;
    }
    const el = imgRef.current;
    if (el?.complete && el.naturalWidth > 0) {
      setIsLoaded(true);
    } else {
      setIsLoaded(false);
    }
  }, [effectiveSrc, folderFailed, folderLoading, eager]);

  useEffect(() => {
    if (!effectiveSrc || folderFailed || folderLoading || shouldLoad) return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      {
        root: rootRef?.current ?? null,
        rootMargin,
        threshold: 0,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [effectiveSrc, shouldLoad, rootMargin, rootRef, folderFailed, folderLoading]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    onError?.(new Error('Image load failed'));
  }, [onError]);

  if (folderFailed || (hasError && effectiveSrc)) {
    return (
      <div
        className={`${className} flex items-center justify-center text-gray-400 text-[10px] select-none`}
        style={{
          ...style,
          ...(aspectRatio ? { aspectRatio } : null),
          backgroundColor: placeholderBg,
        }}
        role="img"
        aria-label={alt || 'Image unavailable'}
      >
        —
      </div>
    );
  }

  if ((folderLoading && !effectiveSrc) || !effectiveSrc) {
    return (
      <div
        ref={containerRef}
        className={`${className} relative flex items-center justify-center overflow-hidden`}
        style={{
          ...style,
          ...(aspectRatio ? { aspectRatio } : null),
          backgroundColor: placeholderBg,
        }}
        aria-hidden
      >
        <div className="absolute inset-0 image-placeholder-breathe" style={{ backgroundColor: placeholderBg }} />
        {PlaceholderMark}
      </div>
    );
  }

  if (aspectRatio) {
    return (
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden block"
        style={{
          aspectRatio: isLoaded ? undefined : aspectRatio,
          backgroundColor: !isLoaded ? placeholderBg : undefined,
        }}
      >
        {!isLoaded && PlaceholderFill}
        {shouldLoad ? (
          <img
            ref={imgRef}
            src={effectiveSrc}
            alt={alt}
            className={`${className} transition-opacity duration-300 ${
              isLoaded
                ? 'relative w-full opacity-100'
                : 'absolute inset-0 w-full h-full object-cover opacity-0'
            }`}
            style={isLoaded ? { height: 'auto' } : undefined}
            onLoad={handleLoad}
            onError={handleError}
            referrerPolicy={referrerPolicy}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            {...props}
          />
        ) : null}
      </div>
    );
  }

  if (!shouldLoad) {
    return (
      <div
        ref={containerRef}
        className={`${className} relative flex items-center justify-center overflow-hidden`}
        style={{ ...style, backgroundColor: placeholderBg }}
        aria-hidden
      >
        {PlaceholderFill}
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={effectiveSrc}
      alt={alt}
      className={`${className} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      style={{
        ...style,
        backgroundColor: !isLoaded ? placeholderBg : undefined,
      }}
      onLoad={handleLoad}
      onError={handleError}
      referrerPolicy={referrerPolicy}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      {...props}
    />
  );
});

OptimizedImage.displayName = 'OptimizedImage';

export { OptimizedImage };
export default OptimizedImage;
