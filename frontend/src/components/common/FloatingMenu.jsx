import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { isRtlActive } from '../../hooks/useRtl';

const MENU_GAP = 8;

/**
 * Portal menu with smart above/below positioning (avoids overflow clipping on ancestors).
 */
export default function FloatingMenu({
  open,
  onClose,
  triggerRef,
  children,
  align = 'end',
  preferAbove = true,
  widthClass = 'w-52',
  className = '',
}) {
  const menuRef = useRef(null);
  const [position, setPosition] = useState(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef?.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;

    const rect = trigger.getBoundingClientRect();
    const menuHeight = menu.offsetHeight || 160;
    const menuWidth = menu.offsetWidth || 208;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openAbove = preferAbove
      ? spaceAbove >= menuHeight + MENU_GAP || spaceBelow < menuHeight + MENU_GAP
      : spaceBelow < menuHeight + MENU_GAP && spaceAbove > spaceBelow;

    const rtl = isRtlActive();
    const visualEnd = align === 'end';
    let top;
    let left;
    let transformOrigin;
    let transform;

    if (openAbove) {
      top = rect.top - MENU_GAP;
      if (visualEnd) {
        transform = rtl ? 'translate(0, -100%)' : 'translate(-100%, -100%)';
        transformOrigin = rtl ? 'bottom left' : 'bottom right';
      } else {
        transform = rtl ? 'translate(-100%, -100%)' : 'translate(0, -100%)';
        transformOrigin = rtl ? 'bottom right' : 'bottom left';
      }
    } else {
      top = rect.bottom + MENU_GAP;
      if (visualEnd) {
        transform = rtl ? 'translate(0, 0)' : 'translate(-100%, 0)';
        transformOrigin = rtl ? 'top left' : 'top right';
      } else {
        transform = rtl ? 'translate(-100%, 0)' : 'translate(0, 0)';
        transformOrigin = rtl ? 'top right' : 'top left';
      }
    }

    if (visualEnd) {
      left = rtl ? rect.left : rect.right;
    } else {
      left = rtl ? rect.right : rect.left;
    }

    const viewportPad = 8;
    if (visualEnd) {
      if (rtl) {
        left = Math.max(left, viewportPad);
        left = Math.min(left, window.innerWidth - menuWidth - viewportPad);
      } else {
        left = Math.min(left, window.innerWidth - viewportPad);
        left = Math.max(left, menuWidth + viewportPad);
      }
    } else if (rtl) {
      left = Math.min(left, window.innerWidth - viewportPad);
      left = Math.max(left, menuWidth + viewportPad);
    } else {
      left = Math.max(left, viewportPad);
      left = Math.min(left, window.innerWidth - menuWidth - viewportPad);
    }

    setPosition({ top, left, transform, transformOrigin, openAbove });
  }, [triggerRef, align, preferAbove]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return undefined;
    }
    updatePosition();
    const raf = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(raf);
  }, [open, updatePosition, children]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    const onScrollOrResize = () => updatePosition();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [open, onClose, updatePosition]);

  if (!open || typeof document === 'undefined') return null;

  const shellStyle = position
    ? {
        position: 'fixed',
        top: position.top,
        left: position.left,
        transform: position.transform,
        transformOrigin: position.transformOrigin,
        zIndex: 210,
      }
    : { position: 'fixed', visibility: 'hidden', zIndex: 210 };

  return createPortal(
    <>
      <div className="fixed inset-0 z-[200]" onClick={onClose} aria-hidden />
      <div
        ref={menuRef}
        role="menu"
        style={shellStyle}
        className={[
          widthClass,
          'min-w-[12rem] max-w-[calc(100vw-1rem)]',
          'rounded-xl border border-surface-200/70 dark:border-white/[0.08]',
          'bg-white/90 dark:bg-surface-900/90 backdrop-blur-2xl',
          'shadow-glass',
          'ring-1 ring-black/[0.04] dark:ring-white/[0.06]',
          'overflow-hidden',
          className,
        ].join(' ')}
      >
        <div
          className={
            !position
              ? 'py-1.5 opacity-0'
              : position.openAbove
                ? 'animate-dropdown-up py-1.5'
                : 'animate-dropdown-down py-1.5'
          }
        >
          {children}
        </div>
      </div>
    </>,
    document.body
  );
}
