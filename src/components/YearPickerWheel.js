import { useState, useRef, useEffect, useMemo } from 'react';

const ITEM_H = 24;
const PAD_H = 44; // (112 - 24) / 2 — centers first/last year at scroll extremes

const WheelColumn = ({ years, selectedYear, onYearChange }) => {
  const ref = useRef(null);
  const animationRef = useRef(null);
  const targetIdxRef = useRef(null);

  useEffect(() => {
    if (ref.current) {
      const idx = years.indexOf(selectedYear);
      ref.current.scrollTop = idx * ITEM_H;
      targetIdxRef.current = idx;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScroll = (e) => {
    const idx = Math.round(e.target.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(idx, years.length - 1));
    onYearChange(years[clamped]);
  };

  // Wheel interception: mouse wheel → preventDefault + 120ms slide to next year.
  // Trackpad (delta < 40 in pixel mode) falls through to native scroll.
  // Perf note: handleScroll fires every frame during JS animation. If parent
  // re-render cost becomes an issue, gate the commit to t >= 1 in step().
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const animateTo = (targetScrollTop) => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      const startScrollTop = el.scrollTop;
      const distance = targetScrollTop - startScrollTop;
      const duration = 120;
      const startTime = performance.now();

      const step = (now) => {
        const t = Math.min((now - startTime) / duration, 1);
        el.scrollTop = startScrollTop + distance * easeOutCubic(t);
        if (t < 1) {
          animationRef.current = requestAnimationFrame(step);
        } else {
          animationRef.current = null;
        }
      };
      animationRef.current = requestAnimationFrame(step);
    };

    const onWheel = (e) => {
      if (e.deltaMode === 0 && Math.abs(e.deltaY) < 40) return;

      e.preventDefault();
      const direction = e.deltaY > 0 ? 1 : -1;
      const currentTarget = targetIdxRef.current ?? Math.round(el.scrollTop / ITEM_H);
      const nextIdx = Math.max(0, Math.min(currentTarget + direction, years.length - 1));
      if (nextIdx === currentTarget) return;

      targetIdxRef.current = nextIdx;
      animateTo(nextIdx * ITEM_H);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [years.length]);

  return (
    <div style={{ position: 'relative', width: 90 }}>
      <div style={{
        position: 'absolute',
        top: PAD_H,
        left: 0,
        right: 0,
        height: ITEM_H,
        background: 'rgba(232, 87, 36, 0.07)',
        borderTop: '1px solid rgba(232, 87, 36, 0.22)',
        borderBottom: '1px solid rgba(232, 87, 36, 0.22)',
        pointerEvents: 'none',
        zIndex: 1,
      }} />
      <div
        ref={ref}
        className="year-picker-wheel-col"
        onScroll={handleScroll}
        style={{
          height: 112,
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          scrollbarWidth: 'none',
        }}
      >
        <div style={{ height: PAD_H }} />
        {years.map((y) => {
          const dist = Math.abs(y - selectedYear);
          const opacity = Math.max(0.2, 1 - dist * 0.35);
          return (
            <div
              key={y}
              onClick={() => {
                const idx = years.indexOf(y);
                ref.current.scrollTop = idx * ITEM_H;
                targetIdxRef.current = idx;
                onYearChange(y);
              }}
              style={{
                height: ITEM_H,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                scrollSnapAlign: 'center',
                fontSize: 13,
                cursor: 'pointer',
                fontWeight: y === selectedYear ? 600 : 400,
                color: 'var(--text-primary)',
                opacity,
                transition: 'opacity 0.1s ease',
              }}
            >
              {y}
            </div>
          );
        })}
        <div style={{ height: PAD_H }} />
      </div>
    </div>
  );
};

const YearPickerWheel = ({ yearRange, setYearRange, dataMinYear, dataMaxYear, isDarkMode, onClose }) => {
  const [fromYear, setFromYear] = useState(yearRange[0]);
  const [toYear, setToYear] = useState(yearRange[1]);

  const years = useMemo(
    () => Array.from({ length: dataMaxYear - dataMinYear + 1 }, (_, i) => dataMinYear + i),
    [dataMinYear, dataMaxYear]
  );

  const isInvalid = fromYear >= toYear;

  const handleApply = () => {
    if (!isInvalid) {
      setYearRange([fromYear, toYear]);
      onClose();
    }
  };

  const handleReset = () => {
    setFromYear(dataMinYear);
    setToYear(dataMaxYear);
  };

  return (
    <div style={{
      position: 'absolute',
      top: 'calc(100% + 6px)',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 240,
      background: 'var(--bg-card)',
      border: '0.5px solid var(--border)',
      borderRadius: 12,
      padding: '12px 14px',
      zIndex: 50,
      boxShadow: isDarkMode ? '0 4px 16px rgba(0,0,0,0.24)' : '0 4px 16px rgba(0,0,0,0.08)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 6 }}>
        <span style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.5px',
          textTransform: 'uppercase', color: 'var(--text-muted)',
        }}>FROM</span>
        <span style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.5px',
          textTransform: 'uppercase', color: 'var(--text-muted)',
        }}>TO</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
        <WheelColumn years={years} selectedYear={fromYear} onYearChange={setFromYear} />
        <span style={{ color: 'var(--text-muted)', fontSize: 16, flexShrink: 0 }}>–</span>
        <WheelColumn years={years} selectedYear={toYear} onYearChange={setToYear} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          onClick={handleReset}
          style={{
            flex: 1, padding: '7px 0', borderRadius: 8,
            border: '0.5px solid var(--border)',
            background: 'transparent', color: 'var(--text-secondary)',
            fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)',
          }}
        >
          Reset
        </button>
        <button
          disabled={isInvalid}
          onClick={handleApply}
          style={{
            flex: 1, padding: '7px 0', borderRadius: 8, border: 'none',
            background: isInvalid ? 'var(--border)' : 'var(--orange)',
            color: isInvalid ? 'var(--text-muted)' : '#fff',
            fontSize: 12, fontWeight: 600,
            cursor: isInvalid ? 'default' : 'pointer',
            fontFamily: 'var(--font)',
            transition: 'background 0.15s ease',
          }}
        >
          Apply
        </button>
      </div>

      {isInvalid && (
        <div style={{
          textAlign: 'center', fontSize: 10,
          color: 'var(--text-muted)', marginTop: 6,
        }}>
          Pick different years
        </div>
      )}
    </div>
  );
};

export default YearPickerWheel;
