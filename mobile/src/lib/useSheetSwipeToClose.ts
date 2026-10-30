import { useCallback, useEffect, useRef } from 'react';
import { triggerHapticFeedback } from '../services/nativeBridge';

interface UseSheetSwipeToCloseOptions {
  onClose: () => void;
  /** 弹窗受控显隐状态（常驻挂载组件必传），默认 true */
  isOpen?: boolean;
  /** 下滑触发关闭的距离阈值（像素），默认 68px */
  closeDistanceThreshold?: number;
  /** 快速下甩触发关闭的速度阈值（px/ms），默认 0.42 */
  closeVelocityThreshold?: number;
}

/**
 * 移动端抽屉弹窗（Bottom Sheet）丝滑下滑关闭手势 Hook
 *
 * 支持两种符合直觉的下滑返回方式：
 * 1. 按住顶部拖拽把手条或弹窗标题栏（带 `data-sheet-drag-handle="true"`）向下拉动，无论内容滚动位置均可随时关闭；
 * 2. 在弹窗内容区处于顶部（`scrollTop <= 2`）时直接继续向下拉动，无缝转为整张卡片跟手下拉关闭，且绝不干扰正常上下滚动与横向标签滑动。
 *
 * 全程直接驱动 GPU `translate3d` 与遮罩透明度，拖拽过程 0 React 重渲染，保证 120Hz 满帧跟手。
 */
export function useSheetSwipeToClose({
  onClose,
  isOpen = true,
  closeDistanceThreshold = 68,
  closeVelocityThreshold = 0.42,
}: UseSheetSwipeToCloseOptions) {
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const isClosingRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const closeWithAnimation = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    triggerHapticFeedback(12);

    const sheetEl = sheetRef.current;
    const backdropEl = backdropRef.current;

    if (sheetEl) {
      sheetEl.style.transition = 'transform 180ms cubic-bezier(0.32, 0.72, 0, 1)';
      sheetEl.style.transform = 'translate3d(0, 105%, 0)';
    }
    if (backdropEl) {
      backdropEl.style.transition = 'opacity 180ms ease-out';
      backdropEl.style.opacity = '0';
    }

    closeTimerRef.current = window.setTimeout(() => {
      onCloseRef.current();
    }, 165);
  }, []);

  // 入场微动效与卸载定时器清理
  useEffect(() => {
    if (!isOpen) {
      isClosingRef.current = false;
      return;
    }
    isClosingRef.current = false;
    const sheetEl = sheetRef.current;
    const backdropEl = backdropRef.current;

    if (sheetEl) {
      sheetEl.style.transition = 'none';
      sheetEl.style.transform = 'translate3d(0, 28px, 0)';
      requestAnimationFrame(() => {
        if (!sheetRef.current || isClosingRef.current) return;
        sheetRef.current.style.transition = 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)';
        sheetRef.current.style.transform = 'translate3d(0, 0px, 0)';
      });
    }

    if (backdropEl) {
      backdropEl.style.transition = 'none';
      backdropEl.style.opacity = '0';
      requestAnimationFrame(() => {
        if (!backdropRef.current || isClosingRef.current) return;
        backdropRef.current.style.transition = 'opacity 180ms ease-out';
        backdropEl.style.opacity = '1';
      });
    }

    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, [isOpen]);

  // 原生 Touch + 桌面端顶部把手 Mouse 拖拽监听（passive: false 确保下拉时阻止 WebView 抢夺手势）
  useEffect(() => {
    if (!isOpen) return;
    const sheetEl = sheetRef.current;
    if (!sheetEl) return;

    type GestureMode = 'idle' | 'pending' | 'dragging' | 'scrolling';

    let mode: GestureMode = 'idle';
    let fromHandle = false;
    let startX = 0;
    let startY = 0;
    let dragAnchorY = 0;
    let startScrollTop = 0;
    let currentOffset = 0;
    let lastY = 0;
    let lastTime = 0;
    let velocityY = 0;

    const applyDragVisual = (offsetPx: number) => {
      const clamped = Math.max(0, offsetPx);
      currentOffset = clamped;
      sheetEl.style.transition = 'none';
      sheetEl.style.transform = `translate3d(0, ${clamped}px, 0)`;

      const backdropEl = backdropRef.current;
      if (backdropEl) {
        const progress = Math.min(1, clamped / 280);
        backdropEl.style.transition = 'none';
        backdropEl.style.opacity = String(Math.max(0.15, 1 - progress * 0.78));
      }
    };

    const springBack = () => {
      currentOffset = 0;
      sheetEl.style.transition = 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)';
      sheetEl.style.transform = 'translate3d(0, 0px, 0)';

      const backdropEl = backdropRef.current;
      if (backdropEl) {
        backdropEl.style.transition = 'opacity 200ms ease-out';
        backdropEl.style.opacity = '1';
      }
    };

    const finishDrag = () => {
      if (mode !== 'dragging') {
        mode = 'idle';
        return;
      }
      mode = 'idle';
      const shouldClose =
        currentOffset >= closeDistanceThreshold ||
        (currentOffset >= 26 && velocityY >= closeVelocityThreshold);

      if (shouldClose) {
        closeWithAnimation();
      } else {
        springBack();
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (isClosingRef.current || e.touches.length !== 1) {
        mode = 'idle';
        return;
      }

      const target = e.target as HTMLElement | null;
      fromHandle = Boolean(target?.closest('[data-sheet-drag-handle="true"]'));

      // 若在非把手区域按住多行文本框/原生下拉框/滑块，优先放行控件自身交互
      if (!fromHandle && target?.closest('textarea, select, input[type="range"], [data-no-sheet-drag="true"]')) {
        mode = 'scrolling';
        return;
      }

      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      dragAnchorY = touch.clientY;
      lastY = touch.clientY;
      lastTime = performance.now();
      velocityY = 0;
      currentOffset = 0;
      startScrollTop = scrollRef.current ? scrollRef.current.scrollTop : 0;
      mode = 'pending';
    };

    const onTouchMove = (e: TouchEvent) => {
      if (isClosingRef.current || mode === 'idle' || mode === 'scrolling' || e.touches.length !== 1) {
        return;
      }

      const touch = e.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      if (mode === 'pending') {
        // 微小抖动不拦截，确保所有按钮点击与输入框聚焦 100% 灵敏
        if (Math.abs(dx) < 7 && Math.abs(dy) < 7) {
          return;
        }

        // 横向滑动（如专属目标胶囊栏横滑）直接放行
        if (Math.abs(dx) >= Math.abs(dy) * 0.92) {
          mode = 'scrolling';
          return;
        }

        // 向上推（浏览下方表单内容）
        if (dy < 0) {
          if (!fromHandle) {
            mode = 'scrolling';
          }
          return;
        }

        // 向下拉（dy > 0）：顶部把手区直接跟手；内容区仅当处于滚动顶部时接管为下拉关闭
        const liveScrollTop = scrollRef.current ? scrollRef.current.scrollTop : 0;
        if (fromHandle || (startScrollTop <= 2 && liveScrollTop <= 2)) {
          mode = 'dragging';
          dragAnchorY = touch.clientY;
          lastY = touch.clientY;
          lastTime = performance.now();
        } else {
          mode = 'scrolling';
          return;
        }
      }

      if (mode === 'dragging') {
        if (e.cancelable) {
          e.preventDefault();
        }
        const now = performance.now();
        const dt = now - lastTime;
        if (dt > 0) {
          const instantV = (touch.clientY - lastY) / dt;
          velocityY = velocityY === 0 ? instantV : 0.7 * instantV + 0.3 * velocityY;
          lastY = touch.clientY;
          lastTime = now;
        }
        applyDragVisual(touch.clientY - dragAnchorY);
      }
    };

    const onTouchEnd = () => {
      finishDrag();
    };

    // 桌面仿真器鼠标拖拽顶部把手支持
    let mouseDragging = false;
    const onMouseDown = (e: MouseEvent) => {
      if (isClosingRef.current || e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (!target?.closest('[data-sheet-drag-handle="true"]') || target.closest('button')) {
        return;
      }
      mouseDragging = true;
      mode = 'pending';
      startY = e.clientY;
      dragAnchorY = e.clientY;
      lastY = e.clientY;
      lastTime = performance.now();
      velocityY = 0;
      currentOffset = 0;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!mouseDragging || isClosingRef.current) return;
      const dy = e.clientY - startY;
      if (mode === 'pending') {
        if (Math.abs(dy) < 5) return;
        if (dy < 0) {
          mouseDragging = false;
          mode = 'idle';
          return;
        }
        mode = 'dragging';
        dragAnchorY = e.clientY;
      }
      if (mode === 'dragging') {
        const now = performance.now();
        const dt = now - lastTime;
        if (dt > 0) {
          velocityY = (e.clientY - lastY) / dt;
          lastY = e.clientY;
          lastTime = now;
        }
        applyDragVisual(e.clientY - dragAnchorY);
      }
    };

    const onMouseUp = () => {
      if (!mouseDragging) return;
      mouseDragging = false;
      finishDrag();
    };

    sheetEl.addEventListener('touchstart', onTouchStart, { passive: true });
    sheetEl.addEventListener('touchmove', onTouchMove, { passive: false });
    sheetEl.addEventListener('touchend', onTouchEnd, { passive: true });
    sheetEl.addEventListener('touchcancel', onTouchEnd, { passive: true });
    sheetEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      sheetEl.removeEventListener('touchstart', onTouchStart);
      sheetEl.removeEventListener('touchmove', onTouchMove);
      sheetEl.removeEventListener('touchend', onTouchEnd);
      sheetEl.removeEventListener('touchcancel', onTouchEnd);
      sheetEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isOpen, closeDistanceThreshold, closeVelocityThreshold, closeWithAnimation]);

  return {
    backdropRef,
    sheetRef,
    scrollRef,
    closeWithAnimation,
  };
}
