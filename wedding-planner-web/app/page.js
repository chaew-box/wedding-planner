"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import {
  Home, LayoutGrid, CalendarDays, Wallet, Plus, X, Pencil, Trash2,
  ChevronLeft, ImagePlus, Check, AlertTriangle, ArrowUp, ArrowDown,
  ArrowLeftRight, Heart, Loader2, ZoomIn, Info, Send, Menu,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

/* ---------------------------------------------------------------
   유틸
--------------------------------------------------------------- */
const genId = () => Math.random().toString(36).slice(2, 10);
const fmtWon = (n) => (Number(n) || 0).toLocaleString("ko-KR") + "원";
const todayISO = () => new Date().toISOString().slice(0, 10);

function compressImage(file, maxW = 1400, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("이미지를 읽을 수 없어요"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("파일을 읽을 수 없어요"));
    reader.readAsDataURL(file);
  });
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

const DEFAULT_ICONS = ["🏛️", "📷", "👗", "💄", "📸", "💐", "🎁", "💍", "🚗", "✈️", "🍽️", "📋"];

/* ---------------------------------------------------------------
   공용 액션 메뉴 (... 스플릿 버튼: 수정/순서변경/삭제)
--------------------------------------------------------------- */
function ActionMenu({ onEdit, onMoveUp, onMoveDown, onDelete, deleteLabel = "정말로 삭제하시겠어요?" }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const MENU_W = 168;

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      setOpen(false); setConfirming(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const toggle = (e) => {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: Math.max(8, Math.min(window.innerWidth - MENU_W - 8, r.right - MENU_W)) });
    }
    setOpen((v) => !v);
    setConfirming(false);
  };

  return (
    <>
      <button ref={btnRef} onClick={toggle} className="p-1.5 rounded hover:bg-gray-50" style={{ color: "#ABA39D" }}>
        <span className="text-base leading-none font-bold tracking-widest">···</span>
      </button>
      {open && (
        <div
          ref={menuRef}
          className="rounded-xl overflow-hidden text-sm"
          style={{ position: "fixed", top: pos.top, left: pos.left, width: MENU_W, zIndex: 100, background: "#FFFFFF", border: "1px solid #ECE7E4", boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {!confirming ? (
            <>
              {onEdit && <button onClick={() => { onEdit(); setOpen(false); }} className="w-full text-left px-3.5 py-2.5 hover:bg-gray-50 flex items-center gap-2" style={{ color: "#2B2622" }}><Pencil size={13} /> 수정</button>}
              {onMoveUp && <button onClick={() => { onMoveUp(); setOpen(false); }} className="w-full text-left px-3.5 py-2.5 hover:bg-gray-50 flex items-center gap-2" style={{ color: "#2B2622" }}><ArrowUp size={13} /> 순서변경(위로)</button>}
              {onMoveDown && <button onClick={() => { onMoveDown(); setOpen(false); }} className="w-full text-left px-3.5 py-2.5 hover:bg-gray-50 flex items-center gap-2" style={{ color: "#2B2622" }}><ArrowDown size={13} /> 순서변경(아래로)</button>}
              {onDelete && <button onClick={() => setConfirming(true)} className="w-full text-left px-3.5 py-2.5 hover:bg-gray-50 flex items-center gap-2" style={{ color: "#C17272" }}><Trash2 size={13} /> 삭제</button>}
            </>
          ) : (
            <div className="p-3">
              <p className="text-xs mb-2.5" style={{ color: "#2B2622" }}>{deleteLabel}</p>
              <div className="flex gap-1.5">
                <button onClick={() => { onDelete(); setOpen(false); setConfirming(false); }} className="flex-1 py-1.5 rounded-lg text-xs text-white" style={{ background: "#C17272" }}>삭제</button>
                <button onClick={() => setConfirming(false)} className="flex-1 py-1.5 rounded-lg text-xs" style={{ background: "#F3EFEC", color: "#6B6157" }}>취소</button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function useLongPress(onLongPress, ms = 450) {
  const timer = useRef(null);
  const start = () => { timer.current = setTimeout(onLongPress, ms); };
  const clear = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  return { onMouseDown: start, onMouseUp: clear, onMouseLeave: clear, onTouchStart: start, onTouchEnd: clear, onTouchMove: clear };
}

function ReorderableRow({ onMoveUp, onMoveDown, children, className = "", style }) {
  const [active, setActive] = useState(false);
  const lp = useLongPress(() => setActive(true));

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setActive(false), 3000);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <div className={"relative " + className} style={style} {...lp}>
      {children}
      {active && (
        <div className="absolute inset-0 flex items-center justify-center gap-3 rounded-xl z-10" style={{ background: "rgba(255,255,255,0.94)" }} onClick={() => setActive(false)}>
          <button disabled={!onMoveUp} onClick={(e) => { e.stopPropagation(); onMoveUp && onMoveUp(); setActive(false); }} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "#F3EFEC", color: onMoveUp ? "#C17272" : "#D8CFCB" }}><ArrowUp size={16} /></button>
          <span className="text-xs" style={{ color: "#8C8480" }}>꾹 눌러 순서변경</span>
          <button disabled={!onMoveDown} onClick={(e) => { e.stopPropagation(); onMoveDown && onMoveDown(); setActive(false); }} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "#F3EFEC", color: onMoveDown ? "#C17272" : "#D8CFCB" }}><ArrowDown size={16} /></button>
        </div>
      )}
    </div>
  );
}

const seedStructure = () => {
  const cats = [
    { id: "cat-hall", name: "웨딩홀", icon: "🏛️", statusId: "none" },
    { id: "cat-studio", name: "스튜디오", icon: "📷", statusId: "none" },
    { id: "cat-dress", name: "드레스", icon: "👗", statusId: "none" },
    { id: "cat-suit", name: "예복", icon: "👔", statusId: "none" },
    { id: "cat-hairmakeup", name: "헤어/메이크업", icon: "💇", statusId: "none" },
    { id: "cat-snap", name: "본식스냅", icon: "📸", statusId: "none" },
    { id: "cat-ring", name: "웨딩링", icon: "💍", statusId: "none" },
    { id: "cat-honeymoon", name: "신혼여행", icon: "✈️", statusId: "none" },
    { id: "cat-planner", name: "플래너", icon: "🗂️", statusId: "none" },
    { id: "cat-invitation", name: "청첩장", icon: "💌", statusId: "none" },
    { id: "cat-parents", name: "혼주", icon: "👨‍👩‍👧", statusId: "none" },
    { id: "cat-gift", name: "답례품", icon: "🎁", statusId: "none" },
    { id: "cat-etc", name: "기타", icon: "📋", statusId: "none" },
  ];
  const groupsByCategory = {};
  const schedule = [
    { id: genId(), title: "결혼준비 시작", date: todayISO(), done: false, categoryId: null, memo: "" },
  ];
  const budget = [];
  const statusOptions = [
    { id: "none", name: "상태없음", color: "#e6e6e6" },
    { id: "todo", name: "진행필요", color: "#ffcfc9" },
    { id: "progress", name: "진행중", color: "#ffe5a0" },
    { id: "confirmed", name: "확정", color: "#d4edbc" },
  ];
  return { weddingDate: "", title: "우리들의 결혼 준비", categories: cats, groupsByCategory, schedule, budget, statusOptions, announcements: [], checklist: [] };
};

const STATUS_COLORS = ["#e6e6e6", "#ffcfc9", "#ffe5a0", "#d4edbc"];

function StatusPickerModal({ category, statusOptions, onPick, onUpdateOptions, onClose }) {
  const [options, setOptions] = useState(statusOptions);
  const [editingId, setEditingId] = useState(null);
  const [colorPickerId, setColorPickerId] = useState(null);

  const commit = (next) => { setOptions(next); onUpdateOptions(next); };
  const updateOption = (id, field, value) => commit(options.map((o) => o.id === id ? { ...o, [field]: value } : o));
  const addOption = () => {
    const next = [...options, { id: genId(), name: "새 옵션", color: STATUS_COLORS[0] }];
    commit(next);
  };
  const removeOption = (id) => commit(options.filter((o) => o.id !== id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(30,24,22,0.45)" }}>
      <div className="rounded-2xl p-5 w-full max-w-xs" style={{ background: "#FFFFFF" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-sm">진행 상태</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-50" style={{ color: "#ABA39D" }}><X size={16} /></button>
        </div>
        <div className="flex flex-col gap-1 mb-3">
          {options.map((o) => {
            const isEditing = editingId === o.id;
            const isPickingColor = colorPickerId === o.id;
            return (
              <div key={o.id} className="rounded-lg" style={{ background: category.statusId === o.id ? "#F3EFEC" : "transparent" }}>
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <button onClick={() => setColorPickerId(isPickingColor ? null : o.id)} className="w-6 h-6 rounded shrink-0 border" style={{ background: o.color, borderColor: "#ECE7E4" }} />
                  {isEditing ? (
                    <input
                      autoFocus
                      value={o.name}
                      onChange={(e) => updateOption(o.id, "name", e.target.value)}
                      onBlur={() => setEditingId(null)}
                      onKeyDown={(e) => e.key === "Enter" && setEditingId(null)}
                      className="flex-1 border rounded px-2 py-1 text-xs"
                      style={{ borderColor: "#ECE7E4" }}
                    />
                  ) : (
                    <button onClick={() => { onPick(o.id); onClose(); }} className="flex-1 text-left text-xs font-medium" style={{ color: "#2B2622" }}>{o.name}</button>
                  )}
                  <button onClick={() => setEditingId(isEditing ? null : o.id)} className="p-1 rounded hover:bg-gray-100 shrink-0" style={{ color: "#ABA39D" }}><Pencil size={11} /></button>
                  <button onClick={() => removeOption(o.id)} className="p-1 rounded hover:bg-gray-100 shrink-0" style={{ color: "#C97B6E" }}><X size={11} /></button>
                </div>
                {isPickingColor && (
                  <div className="flex items-center gap-2 px-2 pb-2">
                    {STATUS_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => { updateOption(o.id, "color", c); setColorPickerId(null); }}
                        className="w-6 h-6 rounded-full"
                        style={{ background: c, border: o.color === c ? "2px solid #C17272" : "1px solid #ECE7E4" }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button onClick={addOption} className="flex items-center gap-1 text-xs px-3 py-2 rounded-lg w-full justify-center" style={{ border: "1px dashed #C9BEB0", color: "#8C8480" }}><Plus size={13} /> 옵션 추가</button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   공통 드래그 재정렬 (꾹 눌러 확대 후 드래그로 순서변경)
--------------------------------------------------------------- */
function useDragReorder(itemIds, onReorderComplete) {
  const [order, setOrder] = useState(itemIds);
  const [draggingId, setDraggingId] = useState(null);
  const rowRefs = useRef({});
  const orderRef = useRef(itemIds);
  const rafRef = useRef(null);
  const lastEventRef = useRef(null);

  useEffect(() => { setOrder(itemIds); orderRef.current = itemIds; }, [JSON.stringify(itemIds)]);
  useEffect(() => { orderRef.current = order; }, [order]);

  const getCenters = () => {
    const map = {};
    orderRef.current.forEach((id) => {
      const el = rowRefs.current[id];
      if (el) {
        const r = el.getBoundingClientRect();
        map[id] = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }
    });
    return map;
  };

  useEffect(() => {
    if (!draggingId) return;

    const step = () => {
      rafRef.current = null;
      const e = lastEventRef.current;
      if (!e) return;
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      const y = e.touches ? e.touches[0].clientY : e.clientY;
      const ids = orderRef.current;
      const centers = getCenters();
      const currentIdx = ids.indexOf(draggingId);
      let nearestIdx = currentIdx;
      let nearestDist = Infinity;
      ids.forEach((id, idx) => {
        const c = centers[id];
        if (!c) return;
        const dx = c.x - x, dy = c.y - y;
        const dist = dx * dx + dy * dy;
        if (dist < nearestDist) { nearestDist = dist; nearestIdx = idx; }
      });
      if (nearestIdx !== currentIdx) {
        const next = [...ids];
        const [moved] = next.splice(currentIdx, 1);
        next.splice(nearestIdx, 0, moved);
        setOrder(next);
      }
    };

    const handleMove = (e) => {
      lastEventRef.current = e;
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(step);
    };
    const handleUp = () => {
      if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      onReorderComplete(orderRef.current);
      setDraggingId(null);
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [draggingId, onReorderComplete]);

  const startDrag = (id) => { document.body.style.userSelect = "none"; setDraggingId(id); };

  return { order, draggingId, startDrag, rowRefs };
}

function DragRow({ id, dnd, children, className = "", style }) {
  const timer = useRef(null);
  const moved = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const HOLD_MS = 2000;
  const MOVE_CANCEL_PX = 10;

  const getXY = (e) => {
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  };

  const onDown = (e) => {
    moved.current = false;
    startPos.current = getXY(e.nativeEvent || e);
    timer.current = setTimeout(() => { moved.current = true; dnd.startDrag(id); }, HOLD_MS);
  };
  const onMove = (e) => {
    if (!timer.current) return;
    const { x, y } = getXY(e.nativeEvent || e);
    const dx = Math.abs(x - startPos.current.x);
    const dy = Math.abs(y - startPos.current.y);
    if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };
  const onUp = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  const isDragging = dnd.draggingId === id;
  return (
    <div
      ref={(el) => { dnd.rowRefs.current[id] = el; }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerLeave={onUp}
      onPointerCancel={onUp}
      onClickCapture={(e) => { if (moved.current) { e.preventDefault(); e.stopPropagation(); moved.current = false; } }}
      className={className}
      style={{
        ...style,
        transform: isDragging ? "scale(1.1)" : "none",
        boxShadow: isDragging ? "0 10px 28px rgba(0,0,0,0.18)" : "none",
        position: "relative",
        zIndex: isDragging ? 50 : "auto",
        transition: isDragging ? "none" : "transform 150ms, box-shadow 150ms",
        touchAction: isDragging ? "none" : "pan-y",
      }}
    >
      {children}
    </div>
  );
}

function ConfirmIconButton({ onDelete, label = "정말로 삭제하시겠어요?", icon = Trash2, size = 14, color = "#D8CFCB" }) {
  const [confirming, setConfirming] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const popRef = useRef(null);
  const Icon = icon;
  const POP_W = 180;

  useEffect(() => {
    if (!confirming) return;
    const onClick = (e) => {
      if (popRef.current && popRef.current.contains(e.target)) return;
      if (btnRef.current && btnRef.current.contains(e.target)) return;
      setConfirming(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [confirming]);

  const open = (e) => {
    e.stopPropagation();
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: Math.max(8, Math.min(window.innerWidth - POP_W - 8, r.right - POP_W)) });
    }
    setConfirming(true);
  };

  return (
    <>
      <button ref={btnRef} onClick={open} className="p-1.5 rounded hover:bg-gray-50" style={{ color }}><Icon size={size} /></button>
      {confirming && (
        <div ref={popRef} className="p-3 rounded-xl text-sm" style={{ position: "fixed", top: pos.top, left: pos.left, width: POP_W, zIndex: 100, background: "#FFFFFF", border: "1px solid #ECE7E4", boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }} onClick={(e) => e.stopPropagation()}>
          <p className="text-xs mb-2.5" style={{ color: "#2B2622" }}>{label}</p>
          <div className="flex gap-1.5">
            <button onClick={() => { onDelete(); setConfirming(false); }} className="flex-1 py-1.5 rounded-lg text-xs text-white" style={{ background: "#C17272" }}>삭제</button>
            <button onClick={() => setConfirming(false)} className="flex-1 py-1.5 rounded-lg text-xs" style={{ background: "#F3EFEC", color: "#6B6157" }}>취소</button>
          </div>
        </div>
      )}
    </>
  );
}

const genShareCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

const seedGroupContents = () => ({
  "grp-a": {
    memoSections: [
      { id: genId(), title: "메모", content: "평일 예약 시 10% 할인. 원본 파일은 별도 구매(30만원)." },
    ],
    photos: [],
    budgetNote: "",
    scheduleNote: "",
  },
});

/* ---------------------------------------------------------------
   메인 앱
--------------------------------------------------------------- */
export default function App() {
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [structure, setStructure] = useState(null);
  const [groupContents, setGroupContents] = useState({});
  const [activeCode, setActiveCode] = useState(null);
  const [isNewWorkspace, setIsNewWorkspace] = useState(false); // 아직 supabase에 생성되지 않은 코드

  const [view, setView] = useState("home");
  const [selectedCatId, setSelectedCatId] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  // 모바일 기기 뒤로가기(시스템 제스처/버튼)를 앱 내부의 "이전 화면"으로 동작하게 만든다.
  // Next.js도 history.state에 자체 내부 정보를 넣어두므로, 덮어쓰지 않고 병합해서 유지해야 함
  const isPoppingRef = useRef(false);
  useEffect(() => {
    window.history.replaceState({ ...window.history.state, view: "home", selectedCatId: null, selectedGroupId: null }, "");
    const onPopState = (e) => {
      isPoppingRef.current = true;
      const s = e.state || {};
      setView(s.view || "home");
      setSelectedCatId(s.selectedCatId ?? null);
      setSelectedGroupId(s.selectedGroupId ?? null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  useEffect(() => {
    if (isPoppingRef.current) { isPoppingRef.current = false; return; }
    window.history.pushState({ ...window.history.state, view, selectedCatId, selectedGroupId }, "");
  }, [view, selectedCatId, selectedGroupId]);
  const [lightbox, setLightbox] = useState(null);

  const [shareMeta, setShareMeta] = useState(null); // { shareCode, userA, userB }
  const [myRole, setMyRole] = useState(null); // 'A' | 'B' | null
  const [showShareModal, setShowShareModal] = useState(false);

  // ---- 로컬(이 브라우저) 전용 값: 현재 보고 있는 공유코드, 내 역할 ----
  const getLocalActiveCode = () => {
    try { return localStorage.getItem("wp-active-code"); } catch { return null; }
  };
  const setLocalActiveCode = (code) => {
    try { localStorage.setItem("wp-active-code", code); } catch {}
  };
  const clearLocalActiveCode = () => {
    try { localStorage.removeItem("wp-active-code"); } catch {}
  };
  const getLocalRole = (code) => {
    try { return localStorage.getItem("wp-role:" + code); } catch { return null; }
  };
  const setLocalRole = (code, role) => {
    try { localStorage.setItem("wp-role:" + code, role); } catch {}
  };

  const rowToStructure = (row) => ({
    weddingDate: row.wedding_date || "",
    title: row.title || "우리들의 결혼 준비",
    categories: (row.categories || []).map((c) => (c.statusId ? c : { ...c, statusId: "none" })),
    groupsByCategory: row.groups_by_category || {},
    schedule: row.schedule || [],
    budget: row.budget || [],
    statusOptions: row.status_options && row.status_options.length ? row.status_options : seedStructure().statusOptions,
    announcements: row.announcements || [],
    checklist: row.checklist || [],
  });

  const structureToRowPatch = (s) => ({
    title: s.title,
    wedding_date: s.weddingDate,
    categories: s.categories,
    groups_by_category: s.groupsByCategory,
    schedule: s.schedule,
    budget: s.budget,
    status_options: s.statusOptions,
    announcements: s.announcements,
    checklist: s.checklist,
    updated_at: new Date().toISOString(),
  });

  // 이미 존재하는 코드만 불러온다 (없으면 null 반환, 새로 만들지 않음)
  const fetchWorkspace = useCallback(async (code) => {
    const { data: row, error } = await supabase.from("workspaces").select("*").eq("code", code).maybeSingle();
    if (error) throw error;
    return row;
  }, []);

  const loadGroupContents = useCallback(async (code, s) => {
    const groupIds = Object.values(s.groupsByCategory || {}).flat().map((g) => g.id);
    const gc = {};
    if (groupIds.length) {
      const { data: gcRows } = await supabase.from("group_contents").select("*").eq("code", code).in("group_id", groupIds);
      (gcRows || []).forEach((r) => {
        gc[r.group_id] = {
          memoSections: r.memo_sections || [],
          photos: r.photos || [],
          budgetNote: r.budget_note || "",
          scheduleNote: r.schedule_note || "",
        };
      });
    }
    groupIds.forEach((gid) => { if (!gc[gid]) gc[gid] = { memoSections: [], photos: [], budgetNote: "", scheduleNote: "" }; });
    return gc;
  }, []);

  const applyWorkspaceRow = useCallback(async (code, row) => {
    const s = rowToStructure(row);
    const gc = await loadGroupContents(code, s);
    setStructure(s);
    setGroupContents(gc);
    setActiveCode(code);
    setIsNewWorkspace(false);
    setShareMeta({ shareCode: code, userA: row.user_a || "", userB: row.user_b || "" });
    setLocalActiveCode(code);
  }, [loadGroupContents]);

  // ---- 초기 로드 ----
  const initLoad = useCallback(async () => {
    setLoading(true);
    try {
      const localCode = getLocalActiveCode();
      if (localCode) {
        const row = await fetchWorkspace(localCode);
        if (row) {
          await applyWorkspaceRow(localCode, row);
          const role = getLocalRole(localCode);
          setMyRole(role);
          if (!role) setShowShareModal(true);
          setSaveError("");
          setLoading(false);
          return;
        }
        // 로컬에 코드가 있지만 DB에는 없는 경우(삭제됨 등) → 새로 시작
        clearLocalActiveCode();
      }

      // 이 브라우저에 저장된 코드가 없음 → 새 후보 코드만 보여주고, 저장 전엔 DB에 아무것도 만들지 않음
      const candidate = genShareCode();
      setShareMeta({ shareCode: candidate, userA: "", userB: "" });
      setStructure(seedStructure());
      setGroupContents({});
      setActiveCode(null);
      setIsNewWorkspace(true);
      setMyRole(null);
      setShowShareModal(true);
      setSaveError("");
    } catch (e) {
      setSaveError("데이터를 불러오지 못했어요. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }, [fetchWorkspace, applyWorkspaceRow]);

  useEffect(() => { initLoad(); }, [initLoad]);

  // 내가 방금 로컬에서 저장을 시작한 시각 — 이 시간 근처에 돌아오는 realtime 이벤트는
  // "내가 방금 보낸 변경의 메아리"일 가능성이 높으므로 무시해서, 타이핑 중 값이 되돌아오는(튀는) 걸 방지
  const lastLocalWriteAtRef = useRef(0);
  const SELF_ECHO_WINDOW_MS = 2500;

  // ---- 실시간 동기화: 같은 코드의 다른 기기 변경사항을 자동 반영 ----
  useEffect(() => {
    if (!activeCode) return;
    const channel = supabase
      .channel("workspace-" + activeCode)
      .on("postgres_changes", { event: "*", schema: "public", table: "workspaces", filter: "code=eq." + activeCode }, (payload) => {
        if (Date.now() - lastLocalWriteAtRef.current < SELF_ECHO_WINDOW_MS) return;
        if (payload.new) {
          setStructure(rowToStructure(payload.new));
          setShareMeta((prev) => ({ ...(prev || {}), shareCode: activeCode, userA: payload.new.user_a || "", userB: payload.new.user_b || "" }));
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "group_contents", filter: "code=eq." + activeCode }, (payload) => {
        if (Date.now() - lastLocalWriteAtRef.current < SELF_ECHO_WINDOW_MS) return;
        const r = payload.new;
        if (!r) return;
        setGroupContents((prev) => ({
          ...prev,
          [r.group_id]: {
            memoSections: r.memo_sections || [],
            photos: r.photos || [],
            budgetNote: r.budget_note || "",
            scheduleNote: r.schedule_note || "",
          },
        }));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeCode]);

  const persistStructure = useCallback(async (next) => {
    setStructure(next);
    if (!activeCode) return; // 아직 워크스페이스가 생성되지 않음(저장 전)
    lastLocalWriteAtRef.current = Date.now();
    try {
      const { error } = await supabase.from("workspaces").update(structureToRowPatch(next)).eq("code", activeCode);
      if (error) setSaveError("저장에 실패했어요. 다시 시도해주세요.");
      else setSaveError("");
    } catch {
      setSaveError("저장에 실패했어요. 다시 시도해주세요.");
    }
  }, [activeCode]);

  const persistGroup = useCallback(async (groupId, content) => {
    setGroupContents((prev) => ({ ...prev, [groupId]: content }));
    if (!activeCode) return;
    lastLocalWriteAtRef.current = Date.now();
    try {
      const { error } = await supabase.from("group_contents").upsert({
        code: activeCode,
        group_id: groupId,
        memo_sections: content.memoSections,
        photos: content.photos,
        budget_note: content.budgetNote,
        schedule_note: content.scheduleNote,
      });
      if (error) setSaveError("저장에 실패했어요. 사진 용량이 너무 클 수 있어요.");
      else setSaveError("");
    } catch {
      setSaveError("저장에 실패했어요. 사진 용량이 너무 클 수 있어요.");
    }
  }, [activeCode]);

  const persistShareMeta = useCallback(async (next) => {
    setShareMeta(next);
    if (!activeCode) return;
    try {
      await supabase.from("workspaces").update({ user_a: next.userA, user_b: next.userB }).eq("code", activeCode);
    } catch {}
  }, [activeCode]);

  const persistMyRole = useCallback(async (role) => {
    setMyRole(role);
    if (activeCode) setLocalRole(activeCode, role);
  }, [activeCode]);

  // "조회": 코드가 실제로 존재할 때만 전환. 존재하지 않으면 false를 반환(생성하지 않음)
  const switchCode = useCallback(async (newCode) => {
    const row = await fetchWorkspace(newCode);
    if (!row) return false;
    setSwitching(true);
    try {
      setView("home");
      setSelectedCatId(null);
      setSelectedGroupId(null);
      await applyWorkspaceRow(newCode, row);
      const role = getLocalRole(newCode);
      setMyRole(role);
      return true;
    } finally {
      setSwitching(false);
    }
  }, [fetchWorkspace, applyWorkspaceRow]);

  // "저장" 클릭 시점에 실제로 코드를 생성 (그 전까지는 supabase에 아무것도 만들지 않음)
  const createWorkspace = useCallback(async (code, userA, userB) => {
    const seed = seedStructure();
    const insertRow = {
      code,
      title: seed.title,
      wedding_date: seed.weddingDate,
      user_a: userA,
      user_b: userB,
      categories: seed.categories,
      groups_by_category: seed.groupsByCategory,
      schedule: seed.schedule,
      budget: seed.budget,
      status_options: seed.statusOptions,
      announcements: seed.announcements,
      checklist: seed.checklist,
    };
    const { data: inserted, error } = await supabase.from("workspaces").insert(insertRow).select().single();
    if (error) { setSaveError("공유코드 생성에 실패했어요. 다시 시도해주세요."); throw error; }
    setStructure(rowToStructure(inserted));
    setGroupContents({});
    setActiveCode(code);
    setIsNewWorkspace(false);
    setShareMeta({ shareCode: code, userA: inserted.user_a || "", userB: inserted.user_b || "" });
    setLocalActiveCode(code);
    setSaveError("");
  }, []);

  if (loading || switching) {
    return (
      <div style={{ background: "#FCFAFA" }} className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3" style={{ color: "#8C8480" }}>
          <Loader2 className="animate-spin" size={28} />
          <p style={{ fontFamily: "'Pretendard Variable', Pretendard, sans-serif" }} className="text-sm">불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!structure) {
    return (
      <div style={{ background: "#FCFAFA", fontFamily: "'Pretendard Variable', Pretendard, sans-serif" }} className="min-h-screen flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-center" style={{ color: "#8C8480" }}>
          <p className="text-sm">{saveError || "데이터를 불러오지 못했어요."}</p>
          <button onClick={initLoad} className="text-xs px-4 py-2 rounded-lg text-white" style={{ background: "#C17272" }}>다시 시도</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#FCFAFA", fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif", color: "#2B2622" }} className="min-h-screen w-full">
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css');
        .font-display { font-family: 'Pretendard Variable', Pretendard, sans-serif; font-weight: 800; letter-spacing: -0.01em; }
        .font-mono { font-family: 'Pretendard Variable', Pretendard, sans-serif; font-variant-numeric: tabular-nums; }
        .scrollbar-thin::-webkit-scrollbar { height: 6px; width: 6px; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #E3DCD7; border-radius: 4px; }
        .tab-shape { border-radius: 10px 10px 0 0; }
        input:focus, textarea:focus { outline: none; }
      `}</style>

      {saveError && (
        <div style={{ background: "#C17272", color: "white" }} className="text-xs px-4 py-1.5 text-center">
          {saveError}
        </div>
      )}

      <div className="flex">
        <Sidebar view={view} setView={(v) => { setView(v); setSelectedCatId(null); setSelectedGroupId(null); }} weddingDate={structure.weddingDate} />

        <main className="flex-1 min-h-screen pb-20 md:pb-0">
          <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-10">
            {view === "home" && (
              <HomeView
                structure={structure}
                groupContents={groupContents}
                onSetDate={(d) => persistStructure({ ...structure, weddingDate: d })}
                onSetTitle={(t) => persistStructure({ ...structure, title: t })}
                goCategory={(catId) => { setSelectedCatId(catId); setView("categories"); }}
                setView={setView}
                shareMeta={shareMeta}
                myRole={myRole}
                onSaveShareMeta={persistShareMeta}
                onPickRole={persistMyRole}
                onSwitchCode={switchCode}
                isNewWorkspace={isNewWorkspace}
                onCreateWorkspace={createWorkspace}
                showShareModal={showShareModal}
                setShowShareModal={setShowShareModal}
                onAddAnnouncement={(content) => {
                  const author = (myRole === "A" ? shareMeta?.userA : myRole === "B" ? shareMeta?.userB : "") || "익명";
                  const next = [{ id: genId(), author, content, date: todayISO() }, ...(structure.announcements || [])].slice(0, 5);
                  persistStructure({ ...structure, announcements: next });
                }}
                onEditAnnouncement={(id, content) => {
                  const next = (structure.announcements || []).map((a) => a.id === id ? { ...a, content } : a);
                  persistStructure({ ...structure, announcements: next });
                }}
                onDeleteAnnouncement={(id) => {
                  const next = (structure.announcements || []).filter((a) => a.id !== id);
                  persistStructure({ ...structure, announcements: next });
                }}
                onUpdateChecklist={(next) => persistStructure({ ...structure, checklist: next })}
              />
            )}

            {view === "categories" && !selectedCatId && (
              <CategoryListView
                structure={structure}
                groupContents={groupContents}
                onOpen={(id) => setSelectedCatId(id)}
                onChange={persistStructure}
              />
            )}

            {view === "categories" && selectedCatId && !selectedGroupId && (
              <CategoryDetailView
                structure={structure}
                category={structure.categories.find((c) => c.id === selectedCatId)}
                onBack={() => setSelectedCatId(null)}
                onOpenGroup={(gid) => setSelectedGroupId(gid)}
                onChange={persistStructure}
                groupContents={groupContents}
                onCreateGroupContent={(gid) => persistGroup(gid, { memoSections: [
                  { id: genId(), title: "메모", content: "" },
                ], photos: [], budgetNote: "", scheduleNote: "" })}
              />
            )}

            {view === "categories" && selectedCatId && selectedGroupId && (
              <GroupDetailView
                category={structure.categories.find((c) => c.id === selectedCatId)}
                group={(structure.groupsByCategory[selectedCatId] || []).find((g) => g.id === selectedGroupId)}
                content={groupContents[selectedGroupId] || { memoSections: [], photos: [], budgetNote: "", scheduleNote: "" }}
                activeCode={activeCode}
                onBack={() => setSelectedGroupId(null)}
                onSave={(content) => persistGroup(selectedGroupId, content)}
                onRenameGroup={(name) => {
                  const groups = structure.groupsByCategory[selectedCatId].map((g) => g.id === selectedGroupId ? { ...g, name } : g);
                  persistStructure({ ...structure, groupsByCategory: { ...structure.groupsByCategory, [selectedCatId]: groups } });
                }}
                openLightbox={(photos, idx) => setLightbox({ photos, idx })}
              />
            )}

            {view === "schedule" && (
              <ScheduleView structure={structure} onChange={persistStructure} />
            )}

            {view === "budget" && (
              <BudgetView structure={structure} onChange={persistStructure} shareMeta={shareMeta} />
            )}
          </div>
        </main>
      </div>

      <MobileNav view={view} setView={(v) => { setView(v); setSelectedCatId(null); setSelectedGroupId(null); }} />

      {lightbox && (
        <Lightbox photos={lightbox.photos} startIdx={lightbox.idx} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   사이드바 / 모바일 네비
--------------------------------------------------------------- */
function NavItems({ view, setView, vertical }) {
  const items = [
    { id: "home", label: "홈", icon: Home },
    { id: "categories", label: "카테고리", icon: LayoutGrid },
    { id: "schedule", label: "스케줄", icon: CalendarDays },
    { id: "budget", label: "가계부", icon: Wallet },
  ];
  return (
    <>
      {items.map((it) => {
        const Icon = it.icon;
        const active = view === it.id;
        return (
          <button
            key={it.id}
            onClick={() => setView(it.id)}
            className={vertical ? "flex items-center gap-3 px-4 py-2.5 rounded-lg w-full text-left transition-colors" : "flex flex-col items-center gap-1 flex-1 py-2"}
            style={vertical ? {
              background: active ? "#F9EEEE" : "transparent",
              color: active ? "#C17272" : "#6B6157",
              fontWeight: active ? 700 : 500,
            } : { color: active ? "#C17272" : "#8C8480" }}
          >
            <Icon size={vertical ? 18 : 20} />
            <span style={{ fontSize: vertical ? 14 : 11 }}>{it.label}</span>
          </button>
        );
      })}
    </>
  );
}

function Sidebar({ view, setView, weddingDate }) {
  const dday = weddingDate ? Math.ceil((new Date(weddingDate) - new Date(todayISO())) / 86400000) : null;
  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 min-h-screen border-r px-4 py-6" style={{ borderColor: "#ECE7E4" }}>
      <div className="flex items-center gap-2 px-2 mb-1">
        <span className="font-display font-bold text-lg">Wedding Planner</span>
      </div>
      <p className="px-2 text-xs mb-6 font-mono" style={{ color: "#C17272" }}>
        {dday !== null ? (dday >= 0 ? `D-${dday}` : `D+${-dday}`) : "날짜 미설정"}
      </p>
      <nav className="flex flex-col gap-1">
        <NavItems view={view} setView={setView} vertical />
      </nav>
    </aside>
  );
}

function MobileNav({ view, setView }) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 flex border-t bg-white z-30" style={{ borderColor: "#ECE7E4" }}>
      <NavItems view={view} setView={setView} vertical={false} />
    </nav>
  );
}

/* ---------------------------------------------------------------
   홈
--------------------------------------------------------------- */
function itemDday(dateStr) {
  const n = Math.ceil((new Date(dateStr) - new Date(todayISO())) / 86400000);
  return n === 0 ? "D-day" : n > 0 ? `D-${n}` : `D+${-n}`;
}

function MiniCalendar({ schedule }) {
  const eventDates = new Set(schedule.map((t) => t.date));
  const today = new Date();
  const dow = today.getDay(); // 0=일 ... 6=토
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - dow);
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
  const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];
  const todayIso = todayISO();
  return (
    <div>
      <div className="grid grid-cols-7 mb-1.5">
        {weekdayLabels.map((w, i) => (
          <div key={w} className="text-center text-[10px]" style={{ color: "#ABA39D" }}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1.5">
        {days.map((d, i) => {
          const iso = d.toISOString().slice(0, 10);
          const isToday = iso === todayIso;
          const hasEvent = eventDates.has(iso);
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <span
                className="text-xs font-mono w-7 h-7 flex items-center justify-center rounded-full"
                style={{
                  background: isToday ? "#C17272" : "transparent",
                  color: isToday ? "#FFFFFF" : "#2B2622",
                  fontWeight: isToday ? 700 : 400,
                }}
              >
                {d.getDate()}
              </span>
              <span className="w-1 h-1 rounded-full" style={{ background: hasEvent ? "#DCA1A1" : "transparent" }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function twoWeekLabel() {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 13);
  const sy = start.getFullYear(), sm = start.getMonth();
  const ey = end.getFullYear(), em = end.getMonth();
  if (sy === ey && sm === em) return `${sy}년 ${sm + 1}월`;
  if (sy === ey) return `${sy}년 ${sm + 1}월~${em + 1}월`;
  return `${sy}년 ${sm + 1}월 ~ ${ey}년 ${em + 1}월`;
}

function TitleEditModal({ value, onSave, onClose }) {
  const [v, setV] = useState(value);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(30,24,22,0.45)" }}>
      <div className="rounded-2xl p-5 w-full max-w-xs" style={{ background: "#FFFFFF" }} onClick={(e) => e.stopPropagation()}>
        <h2 className="font-bold text-sm mb-3">타이틀 수정</h2>
        <input autoFocus value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (onSave(v.trim() || value), onClose())} className="border rounded-lg px-3 py-2 text-sm w-full mb-3" style={{ borderColor: "#ECE7E4" }} />
        <div className="flex gap-2">
          <button onClick={() => { onSave(v.trim() || value); onClose(); }} className="flex-1 py-2 rounded-lg text-sm text-white" style={{ background: "#C17272" }}>저장</button>
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm" style={{ background: "#F3EFEC", color: "#6B6157" }}>취소</button>
        </div>
      </div>
    </div>
  );
}

function ShareSetupModal({ meta, myRole, isNew, onSaveNames, onPickRole, onSwitchCode, onCreateWorkspace, onClose }) {
  const [userA, setUserA] = useState(meta?.userA || "");
  const [userB, setUserB] = useState(meta?.userB || "");
  const [role, setRole] = useState(myRole || null);
  const [copied, setCopied] = useState(false);
  const [editingCode, setEditingCode] = useState(false);
  const [codeDraft, setCodeDraft] = useState(meta?.shareCode || "");
  const [codeError, setCodeError] = useState("");
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveErrorMsg, setSaveErrorMsg] = useState("");

  const copyCode = async () => {
    const ok = await copyToClipboard(meta?.shareCode || "");
    setCopied(ok ? "복사됨" : "복사 실패");
    setTimeout(() => setCopied(false), 1500);
  };

  const canSave = userA.trim() !== "" && userB.trim() !== "" && !editingCode;

  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setSaveErrorMsg("");
    try {
      if (isNew) {
        await onCreateWorkspace(meta.shareCode, userA.trim(), userB.trim());
      } else {
        await onSaveNames({ ...meta, userA: userA.trim(), userB: userB.trim() });
      }
      if (role) onPickRole(role);
      onClose();
    } catch (e) {
      setSaveErrorMsg("저장에 실패했어요. 인터넷 연결을 확인하고 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  const lookup = async () => {
    const code = codeDraft.trim().toUpperCase();
    if (!code) return;
    if (code === meta?.shareCode) { setEditingCode(false); setCodeError(""); return; }
    setChecking(true);
    setCodeError("");
    try {
      const ok = await onSwitchCode(code);
      if (!ok) setCodeError("유효하지 않은 공유코드입니다.");
      else setEditingCode(false);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(30,24,22,0.45)" }}>
      <div className="rounded-2xl p-5 w-full max-w-sm" style={{ background: "#FFFFFF" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-sm">공유코드 설정</h2>
          {!isNew && (
            <button onClick={onClose} className="p-1 rounded hover:bg-gray-50" style={{ color: "#ABA39D" }}><X size={16} /></button>
          )}
        </div>
        {isNew && (
          <p className="text-[11px] mb-3 px-2.5 py-2 rounded-lg" style={{ background: "#F9EEEE", color: "#C17272" }}>
            아직 저장되지 않았어요. 아래 정보를 입력하고 저장을 눌러야 데이터가 만들어져요. 이미 코드가 있다면 위에서 수정 → 조회로 입력해주세요.
          </p>
        )}

        <p className="text-xs mb-1.5" style={{ color: "#8C8480" }}>우리 커플의 공유코드</p>
        <div className="flex items-center gap-1.5" style={{ marginBottom: codeError ? 4 : 16 }}>
          {editingCode ? (
            <input
              autoFocus
              value={codeDraft}
              onChange={(e) => setCodeDraft(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && lookup()}
              className="h-11 min-w-0 font-mono text-lg font-bold px-3 rounded-lg flex-1 text-center border"
              style={{ color: "#C17272", letterSpacing: 2, borderColor: "#C17272" }}
            />
          ) : (
            <span className="h-11 min-w-0 flex items-center justify-center font-mono text-lg font-bold px-3 rounded-lg flex-1" style={{ background: "#F3EFEC", color: "#C17272", letterSpacing: 2 }}>{meta?.shareCode || "------"}</span>
          )}
          <button
            onClick={() => { setCodeDraft(meta?.shareCode || ""); setCodeError(""); setEditingCode((v) => !v); }}
            className="h-11 text-xs px-3 rounded-lg shrink-0"
            style={{ background: "#F3EFEC", color: "#6B6157" }}
          >
            {editingCode ? "취소" : "수정"}
          </button>
          {editingCode ? (
            <button onClick={lookup} disabled={checking} className="h-11 text-xs px-3 rounded-lg shrink-0 text-white" style={{ background: "#C17272" }}>{checking ? "확인중" : "조회"}</button>
          ) : (
            <button onClick={copyCode} className="h-11 text-xs px-3 rounded-lg shrink-0" style={{ background: "#F9EEEE", color: "#C17272" }}>{copied || "복사"}</button>
          )}
        </div>
        {codeError && <p className="text-[11px] mb-2" style={{ color: "#C17272" }}>{codeError}</p>}
        <p className="text-[11px] mb-4" style={{ color: "#ABA39D" }}>
          {editingCode
            ? "이미 만들어진 코드만 입력할 수 있어요. 입력 후 조회하면 그 코드로 저장된 데이터로 화면이 전환돼요."
            : isNew
              ? "이 코드는 아직 저장되지 않았어요. 아래 정보를 입력하고 저장하면 이 코드로 워크스페이스가 만들어져요. 이미 코드가 있다면 위에서 수정 → 조회로 입력해주세요."
              : "이 코드를 배우자에게 알려주고 같은 사이트 주소에서 입력하면, 기기가 달라도 같은 데이터를 실시간으로 함께 보고 편집할 수 있어요."}
        </p>

        <p className="text-xs font-bold mb-2" style={{ color: "#8C8480" }}>결혼 주인공 정보</p>
        <div className="flex flex-col gap-2 mb-5">
          <div className="flex items-center gap-2">
            <input value={userA} onChange={(e) => setUserA(e.target.value)} placeholder="신랑 이름" className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-0" style={{ borderColor: "#ECE7E4" }} />
            <button onClick={() => setRole("A")} className="text-xs px-3 py-2 rounded-lg shrink-0" style={{ background: role === "A" ? "#C17272" : "#F3EFEC", color: role === "A" ? "#FFFFFF" : "#6B6157" }}>{role === "A" ? "✓ 본인" : "본인"}</button>
          </div>
          <div className="flex items-center gap-2">
            <input value={userB} onChange={(e) => setUserB(e.target.value)} placeholder="신부 이름" className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-0" style={{ borderColor: "#ECE7E4" }} />
            <button onClick={() => setRole("B")} className="text-xs px-3 py-2 rounded-lg shrink-0" style={{ background: role === "B" ? "#C17272" : "#F3EFEC", color: role === "B" ? "#FFFFFF" : "#6B6157" }}>{role === "B" ? "✓ 본인" : "본인"}</button>
          </div>
        </div>

        {saveErrorMsg && <p className="text-[11px] mb-2" style={{ color: "#C17272" }}>{saveErrorMsg}</p>}
        <button
          onClick={save}
          disabled={!canSave || saving}
          className="w-full h-11 rounded-lg text-sm font-medium text-white"
          style={{ background: canSave ? "#C17272" : "#D8CFCB", cursor: canSave ? "pointer" : "not-allowed" }}
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}

function fmtDateDot(dateStr) {
  return dateStr ? dateStr.replaceAll("-", ".") : "";
}

function fmtYYMMDD(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${y.slice(2)}.${m}.${d}`;
}

function AnnouncementAddModal({ onAdd, onClose }) {
  const [content, setContent] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(30,24,22,0.45)" }}>
      <div className="rounded-2xl p-5 w-full max-w-sm" style={{ background: "#FFFFFF" }} onClick={(e) => e.stopPropagation()}>
        <h2 className="font-bold text-sm mb-3">공지사항 추가</h2>
        <textarea autoFocus value={content} onChange={(e) => setContent(e.target.value)} placeholder="내용을 작성하세요." rows={4} className="border rounded-lg px-3 py-2 text-sm w-full mb-3 resize-none" style={{ borderColor: "#ECE7E4" }} />
        <div className="flex gap-2">
          <button onClick={() => { if (content.trim()) { onAdd(content.trim()); onClose(); } }} className="flex-1 py-2 rounded-lg text-sm text-white" style={{ background: "#C17272" }}>추가</button>
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm" style={{ background: "#F3EFEC", color: "#6B6157" }}>취소</button>
        </div>
      </div>
    </div>
  );
}

function AnnouncementDetailModal({ announcement, onSave, onDelete, onClose }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(announcement.content);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(30,24,22,0.45)" }}>
      <div className="rounded-2xl p-5 w-full max-w-sm" style={{ background: "#FFFFFF" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: "#F9EEEE", color: "#C17272" }}>{announcement.author || "익명"}</span>
          <span className="text-xs font-mono" style={{ color: "#ABA39D" }}>{fmtYYMMDD(announcement.date)}</span>
        </div>

        {editing ? (
          <textarea autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} className="border rounded-lg px-3 py-2 text-sm w-full mb-3 resize-none" style={{ borderColor: "#ECE7E4" }} />
        ) : (
          <p className="text-sm mb-4 whitespace-pre-wrap" style={{ color: "#2B2622" }}>{announcement.content}</p>
        )}

        {confirming ? (
          <div>
            <p className="text-xs mb-2.5" style={{ color: "#2B2622" }}>정말로 이 공지사항을 삭제하시겠어요?</p>
            <div className="flex gap-2">
              <button onClick={() => { onDelete(); onClose(); }} className="flex-1 py-2 rounded-lg text-sm text-white" style={{ background: "#C17272" }}>삭제</button>
              <button onClick={() => setConfirming(false)} className="flex-1 py-2 rounded-lg text-sm" style={{ background: "#F3EFEC", color: "#6B6157" }}>취소</button>
            </div>
          </div>
        ) : editing ? (
          <div className="flex gap-2">
            <button onClick={() => { if (draft.trim()) { onSave(draft.trim()); onClose(); } }} className="flex-1 py-2 rounded-lg text-sm text-white" style={{ background: "#C17272" }}>저장</button>
            <button onClick={() => setEditing(false)} className="flex-1 py-2 rounded-lg text-sm" style={{ background: "#F3EFEC", color: "#6B6157" }}>취소</button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(true)} className="flex-1 py-2 rounded-lg text-sm" style={{ background: "#F3EFEC", color: "#2B2622" }}>수정</button>
            <button onClick={() => setConfirming(true)} className="flex-1 py-2 rounded-lg text-sm" style={{ background: "#F3EFEC", color: "#C17272" }}>삭제</button>
          </div>
        )}
      </div>
    </div>
  );
}

function DatePickerModal({ value, onSelect, onClose }) {
  const init = value ? new Date(value) : new Date();
  const [monthCursor, setMonthCursor] = useState(new Date(init.getFullYear(), init.getMonth(), 1));
  const pad = (n) => String(n).padStart(2, "0");
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];
  const changeMonth = (delta) => setMonthCursor(new Date(year, month + delta, 1));
  const todayIso = todayISO();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(30,24,22,0.45)" }}>
      <div className="rounded-2xl p-5 w-full max-w-xs" style={{ background: "#FFFFFF" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-sm">결혼식 날짜 선택</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-50" style={{ color: "#ABA39D" }}><X size={16} /></button>
        </div>
        <div className="flex items-center justify-center gap-4 mb-3">
          <button onClick={() => changeMonth(-1)} className="p-1.5 rounded hover:bg-gray-50" style={{ color: "#8C8480" }}><ChevronLeft size={18} /></button>
          <span className="font-mono font-bold text-sm">{year}. {pad(month + 1)}</span>
          <button onClick={() => changeMonth(1)} className="p-1.5 rounded hover:bg-gray-50 rotate-180" style={{ color: "#8C8480" }}><ChevronLeft size={18} /></button>
        </div>
        <div className="grid grid-cols-7 mb-1">
          {weekdayLabels.map((w) => <div key={w} className="text-center text-[11px]" style={{ color: "#ABA39D" }}>{w}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (d === null) return <div key={i} />;
            const iso = `${year}-${pad(month + 1)}-${pad(d)}`;
            const isSelected = iso === value;
            const isToday = iso === todayIso;
            return (
              <button
                key={i}
                onClick={() => { onSelect(iso); onClose(); }}
                className="aspect-square rounded-lg flex items-center justify-center text-xs font-mono"
                style={{
                  background: isSelected ? "#C17272" : isToday ? "#F9EEEE" : "transparent",
                  color: isSelected ? "#FFFFFF" : "#2B2622",
                  fontWeight: isSelected || isToday ? 700 : 400,
                }}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ChecklistSection({ checklist, onUpdate }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState("");
  const [visibleCount, setVisibleCount] = useState(20);

  const undone = checklist.filter((c) => !c.done);
  const done = [...checklist.filter((c) => c.done)].sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));

  const undoneIds = undone.map((c) => c.id);
  const reorderUndone = useCallback((newIdOrder) => {
    const byId = Object.fromEntries(undone.map((c) => [c.id, c]));
    const nextUndone = newIdOrder.map((id) => byId[id]);
    onUpdate([...nextUndone, ...checklist.filter((c) => c.done)]);
  }, [undone, checklist, onUpdate]);
  const dnd = useDragReorder(undoneIds, reorderUndone);

  // 드래그 중에도 실시간으로 반영되도록 dnd.order 기준으로 렌더링
  const orderedUndone = dnd.order.map((id) => undone.find((c) => c.id === id)).filter(Boolean);
  const sorted = [...orderedUndone, ...done];
  const visible = sorted.slice(0, visibleCount);
  const hasMore = sorted.length > visibleCount;

  const addItem = () => {
    const id = genId();
    onUpdate([{ id, content: "", done: false, doneAt: null, createdAt: Date.now() }, ...checklist]);
    setEditingId(id);
    setDraft("");
  };

  const saveEdit = (id) => {
    const trimmed = draft.trim();
    if (!trimmed) onUpdate(checklist.filter((c) => c.id !== id));
    else onUpdate(checklist.map((c) => c.id === id ? { ...c, content: trimmed } : c));
    setEditingId(null);
  };

  const toggleDone = (id) => {
    onUpdate(checklist.map((c) => c.id === id ? { ...c, done: !c.done, doneAt: !c.done ? Date.now() : null } : c));
  };

  const removeItem = (id) => onUpdate(checklist.filter((c) => c.id !== id));
  const card = { background: "#FFFFFF", border: "1px solid #ECE7E4" };

  return (
    <div className="rounded-2xl p-5" style={card}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-sm">체크리스트</h2>
        <button onClick={addItem} className="text-xs" style={{ color: "#C17272" }}>추가하기</button>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm" style={{ color: "#ABA39D" }}>등록된 항목이 없어요.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((item) => {
            const isEditing = editingId === item.id;
            if (isEditing) {
              return (
                <div key={item.id} className="flex items-center gap-2 rounded-lg" style={{ paddingTop: 2, paddingBottom: 2 }}>
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveEdit(item.id)}
                    placeholder="할 일을 입력하세요."
                    className="flex-1 border rounded-lg px-2 py-1.5 text-sm min-w-0"
                    style={{ borderColor: "#ECE7E4" }}
                  />
                  <button onClick={() => saveEdit(item.id)} className="px-3 py-1.5 rounded-lg text-xs text-white shrink-0" style={{ background: "#C17272" }}>저장</button>
                </div>
              );
            }
            const row = (
              <div className="flex items-center gap-2.5 rounded-lg" style={{ paddingTop: 2, paddingBottom: 2 }}>
                <button onClick={() => toggleDone(item.id)} className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: item.done ? "#7C8B6F" : "transparent", border: item.done ? "none" : "1.5px solid #D8CFCB" }}>
                  {item.done && <Check size={12} color="white" />}
                </button>
                <p className="flex-1 text-sm truncate" style={{ textDecoration: item.done ? "line-through" : "none", color: item.done ? "#ABA39D" : "#2B2622" }}>{item.content}</p>
                <button onClick={() => { setEditingId(item.id); setDraft(item.content); }} className="p-1 rounded hover:bg-white shrink-0" style={{ color: "#ABA39D" }}><Pencil size={13} /></button>
                <ConfirmIconButton onDelete={() => removeItem(item.id)} label="정말로 이 항목을 삭제하시겠어요?" />
              </div>
            );
            return item.done ? (
              <div key={item.id}>{row}</div>
            ) : (
              <DragRow key={item.id} id={item.id} dnd={dnd}>{row}</DragRow>
            );
          })}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center mt-3">
          <button onClick={() => setVisibleCount((v) => v + 20)} className="text-xs" style={{ color: "#C17272" }}>더보기</button>
        </div>
      )}
    </div>
  );
}

function HomeView({ structure, goCategory, setView, onSetDate, onSetTitle, shareMeta, myRole, onSaveShareMeta, onPickRole, onSwitchCode, isNewWorkspace, onCreateWorkspace, showShareModal, setShowShareModal, onAddAnnouncement, onEditAnnouncement, onDeleteAnnouncement, onUpdateChecklist }) {
  const [editingDate, setEditingDate] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [addingAnnouncement, setAddingAnnouncement] = useState(false);
  const [openAnnouncement, setOpenAnnouncement] = useState(null);
  const dday = structure.weddingDate ? Math.ceil((new Date(structure.weddingDate) - new Date(todayISO())) / 86400000) : null;
  const twoWeeksEnd = new Date(); twoWeeksEnd.setDate(twoWeeksEnd.getDate() + 13);
  const twoWeeksEndISO = twoWeeksEnd.toISOString().slice(0, 10);
  const upcomingAll = [...structure.schedule].filter((t) => !t.done && t.date >= todayISO()).sort((a, b) => a.date.localeCompare(b.date));
  const upcomingIn2Weeks = upcomingAll.filter((t) => t.date <= twoWeeksEndISO);
  const isDense = upcomingIn2Weeks.length >= 5;
  const upcoming = upcomingAll.slice(0, 8);
  const announcements = structure.announcements || [];
  const card = { background: "#FFFFFF", border: "1px solid #ECE7E4" };
  const title = structure.title || "우리들의 결혼 준비";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => setEditingTitle(true)} className="font-display text-2xl font-bold mb-1 text-left hover:opacity-70 transition-opacity">{title}</button>
        <button onClick={() => setShowShareModal(true)} className="flex items-center gap-2 shrink-0 px-3 py-1.5 rounded-full text-xs" style={{ background: "#F3EFEC", color: "#6B6157" }}>
          {shareMeta?.userA || shareMeta?.userB ? (
            <span>
              <span style={{ fontWeight: myRole === "A" ? 700 : 400, color: myRole === "A" ? "#C17272" : "#6B6157" }}>{shareMeta.userA || "사용자A"}</span>
              {" ♥ "}
              <span style={{ fontWeight: myRole === "B" ? 700 : 400, color: myRole === "B" ? "#C17272" : "#6B6157" }}>{shareMeta.userB || "사용자B"}</span>
            </span>
          ) : (
            <span>공유코드 설정</span>
          )}
        </button>
      </div>

      <div className="rounded-2xl p-5 flex items-center justify-between" style={card}>
        {structure.weddingDate ? (
          <button onClick={() => setEditingDate(true)} className="text-left">
            <p className="text-xs mb-1" style={{ color: "#8C8480" }}>Our Wedding Day</p>
            <div className="flex items-center gap-2">
              <p className="font-mono text-2xl font-bold" style={{ color: "#2B2622" }}>{fmtDateDot(structure.weddingDate)}</p>
              <span className="text-xs font-bold px-2 py-1 rounded-md" style={{ background: "#F9EEEE", color: "#C17272" }}>
                {dday >= 0 ? `D-${dday}` : `D+${-dday}`}
              </span>
              <Pencil size={12} style={{ color: "#ABA39D" }} />
            </div>
          </button>
        ) : (
          <button onClick={() => setEditingDate(true)} className="flex items-center gap-2 text-left">
            <p className="text-sm" style={{ color: "#8C8480" }}>Our Wedding Day</p>
            <span className="text-xs px-3 py-1.5 rounded-lg text-white" style={{ background: "#C17272" }}>날짜 선택</span>
          </button>
        )}
        <Heart size={40} style={{ color: "#F9EEEE" }} fill="#F9EEEE" />
      </div>
      {editingDate && (
        <DatePickerModal value={structure.weddingDate} onSelect={onSetDate} onClose={() => setEditingDate(false)} />
      )}

      <div className="rounded-2xl p-5" style={card}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-sm">공지사항</h2>
          <button onClick={() => setAddingAnnouncement(true)} className="text-xs" style={{ color: "#C17272" }}>추가하기</button>
        </div>
        {announcements.length === 0 ? (
          <p className="text-sm" style={{ color: "#ABA39D" }}>등록된 공지사항이 없어요.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {announcements.slice(0, 5).map((a) => (
              <li key={a.id}>
                <button onClick={() => setOpenAnnouncement(a)} className="flex items-center gap-3 text-sm w-full text-left">
                  <span className="text-xs font-bold px-2 py-1 rounded-full shrink-0" style={{ background: "#F9EEEE", color: "#C17272" }}>{a.author || "익명"}</span>
                  <span className="flex-1 truncate">{a.content}</span>
                  <span className="font-mono text-xs shrink-0" style={{ color: "#ABA39D" }}>{fmtYYMMDD(a.date)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div style={{ borderTop: "1px solid #ECE7E4", margin: "28px 0" }} />

        <div className="flex flex-col md:flex-row" style={{ gap: 36 }}>
          <div style={{ flex: "1 1 auto", minWidth: 300 }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-sm">다가오는 일정</h2>
              <button onClick={() => setView("schedule")} className="text-xs" style={{ color: "#C17272" }}>전체보기</button>
            </div>
            {upcomingIn2Weeks.length === 0 ? (
              <p className="text-sm" style={{ color: "#ABA39D" }}>2주 이내 일정이 없어요.</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {upcomingIn2Weeks.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 text-sm">
                    <span className="font-mono text-xs font-bold px-2 py-1 rounded-md shrink-0" style={{ background: "#F9EEEE", color: "#C17272" }}>{itemDday(t.date)}</span>
                    <span className="flex-1 truncate">{t.title}</span>
                    <span className="font-mono text-xs shrink-0" style={{ color: "#ABA39D" }}>{t.date}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="md:w-[288px] shrink-0 rounded-xl p-3" style={{ background: "#F9EEEE" }}>
            <p className="text-xs font-bold mb-2" style={{ color: "#C17272" }}>{twoWeekLabel()}</p>
            <MiniCalendar schedule={structure.schedule} />
          </div>
        </div>
      </div>

      <ChecklistSection checklist={structure.checklist || []} onUpdate={onUpdateChecklist} />

      {editingTitle && <TitleEditModal value={title} onSave={onSetTitle} onClose={() => setEditingTitle(false)} />}
      {addingAnnouncement && <AnnouncementAddModal onAdd={onAddAnnouncement} onClose={() => setAddingAnnouncement(false)} />}
      {openAnnouncement && (
        <AnnouncementDetailModal
          announcement={openAnnouncement}
          onSave={(content) => onEditAnnouncement(openAnnouncement.id, content)}
          onDelete={() => onDeleteAnnouncement(openAnnouncement.id)}
          onClose={() => setOpenAnnouncement(null)}
        />
      )}
      {showShareModal && (
        <ShareSetupModal
          meta={shareMeta}
          myRole={myRole}
          isNew={isNewWorkspace}
          onSaveNames={onSaveShareMeta}
          onPickRole={onPickRole}
          onSwitchCode={onSwitchCode}
          onCreateWorkspace={onCreateWorkspace}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   카테고리 리스트
--------------------------------------------------------------- */
function CategoryListView({ structure, groupContents, onOpen, onChange }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(DEFAULT_ICONS[0]);
  const [renamingId, setRenamingId] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [statusPickerFor, setStatusPickerFor] = useState(null);
  const statusOptions = structure.statusOptions || [];

  const addCategory = () => {
    if (!name.trim()) return;
    const next = { ...structure, categories: [...structure.categories, { id: genId(), name: name.trim(), icon, statusId: "none" }] };
    onChange(next);
    setName(""); setAdding(false);
  };

  const remove = (id) => {
    const { [id]: _, ...restGroups } = structure.groupsByCategory;
    onChange({ ...structure, categories: structure.categories.filter((c) => c.id !== id), groupsByCategory: restGroups });
  };

  const rename = (id, newName) => {
    onChange({ ...structure, categories: structure.categories.map((c) => c.id === id ? { ...c, name: newName.trim() || c.name } : c) });
    setRenamingId(null);
  };

  const setStatus = (id, statusId) => {
    onChange({ ...structure, categories: structure.categories.map((c) => c.id === id ? { ...c, statusId } : c) });
  };

  const updateStatusOptions = (next) => onChange({ ...structure, statusOptions: next });

  const catIds = structure.categories.map((c) => c.id);
  const reorderCategories = useCallback((newIdOrder) => {
    const byId = Object.fromEntries(structure.categories.map((c) => [c.id, c]));
    onChange({ ...structure, categories: newIdOrder.map((id) => byId[id]) });
  }, [structure, onChange]);
  const dnd = useDragReorder(catIds, reorderCategories);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-2xl font-bold">카테고리</h1>
        <button onClick={() => setAdding(true)} className="flex items-center gap-1 text-sm px-3 py-2 rounded-lg text-white" style={{ background: "#C17272" }}>
          <Plus size={16} /> 카테고리 추가
        </button>
      </div>

      {adding && (
        <div className="rounded-xl p-4 mb-4" style={{ background: "#FFFFFF", border: "1px solid #ECE7E4" }}>
          <div className="flex flex-wrap items-center gap-2 mb-2.5">
            <input
              value={icon}
              onChange={(e) => setIcon(Array.from(e.target.value).slice(-1).join("") || "")}
              placeholder="🎨"
              title="이모지 키보드로 원하는 아이콘을 직접 입력하세요"
              className="border rounded-lg w-12 py-2 text-center text-lg"
              style={{ borderColor: "#ECE7E4" }}
            />
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCategory()} placeholder="카테고리 이름 (예: 신혼여행)" className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[160px]" style={{ borderColor: "#ECE7E4" }} />
            <button onClick={addCategory} className="px-3 py-2 rounded-lg text-sm text-white" style={{ background: "#7C8B6F" }}>추가</button>
            <button onClick={() => setAdding(false)} className="px-3 py-2 rounded-lg text-sm" style={{ color: "#8C8480" }}>취소</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {DEFAULT_ICONS.map((i) => (
              <button key={i} onClick={() => setIcon(i)} className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ background: icon === i ? "#F9EEEE" : "#F3EFEC" }}>{i}</button>
            ))}
          </div>
          <p className="text-xs mt-2" style={{ color: "#ABA39D" }}>모바일은 이모지 키보드, PC는 Win+. / Cmd+Ctrl+Space로 원하는 이모지를 직접 입력할 수 있어요.</p>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {dnd.order.map((catId) => {
          const c = structure.categories.find((cc) => cc.id === catId);
          if (!c) return null;
          const idx = structure.categories.findIndex((cc) => cc.id === catId);
          const groups = structure.groupsByCategory[c.id] || [];
          const allPhotos = groups.flatMap((g) => groupContents[g.id]?.photos || []);
          const previewPhotos = allPhotos.slice(0, 3);
          const isRenaming = renamingId === c.id;
          const status = statusOptions.find((o) => o.id === c.statusId);
          return (
            <DragRow key={c.id} id={c.id} dnd={dnd} className="flex items-stretch rounded-xl overflow-hidden">
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none", border: "1px solid #ECE7E4", borderRadius: 12 }} />
              <div className="flex items-stretch w-full">
                {isRenaming ? (
                  <div className="flex-1 flex items-center gap-2 px-4 py-3" style={{ background: "#FFFFFF" }}>
                    <span className="text-xl">{c.icon}</span>
                    <input
                      autoFocus
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && rename(c.id, renameDraft)}
                      onBlur={() => rename(c.id, renameDraft)}
                      className="border rounded-lg px-2 py-1.5 text-sm flex-1"
                      style={{ borderColor: "#ECE7E4" }}
                    />
                  </div>
                ) : (
                  <button onClick={() => onOpen(c.id)} className="flex-1 flex items-center gap-3 px-4 py-3.5 text-left min-w-0" style={{ background: "#FFFFFF" }}>
                    <span className="text-xl shrink-0">{c.icon}</span>
                    <div className="shrink-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-sm">{c.name}</p>
                        <span
                          onClick={(e) => { e.stopPropagation(); setStatusPickerFor(c.id); }}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: status ? status.color : "#EFEBE6", color: "#4A4237" }}
                        >
                          {status ? status.name : "상태 없음"}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: "#ABA39D" }}>그룹 {groups.length}개</p>
                    </div>
                  </button>
                )}
                <div className="flex items-center px-2" style={{ background: "#FFFFFF" }}>
                  <ActionMenu
                    onEdit={() => { setRenamingId(c.id); setRenameDraft(c.name); }}
                    onDelete={() => remove(c.id)}
                    deleteLabel="정말로 이 카테고리를 삭제하시겠어요? 하위 그룹과 사진도 함께 삭제돼요."
                  />
                </div>
              </div>
            </DragRow>
          );
        })}
      </div>

      {statusPickerFor && (
        <StatusPickerModal
          category={structure.categories.find((c) => c.id === statusPickerFor)}
          statusOptions={statusOptions}
          onPick={(sid) => setStatus(statusPickerFor, sid)}
          onUpdateOptions={updateStatusOptions}
          onClose={() => setStatusPickerFor(null)}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   카테고리 상세 (그룹 탭 리스트)
--------------------------------------------------------------- */
function CategoryDetailView({ structure, category, onBack, onOpenGroup, onChange, onCreateGroupContent, groupContents }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [renamingGroupId, setRenamingGroupId] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");
  const groups = structure.groupsByCategory[category.id] || [];

  const addGroup = () => {
    if (!name.trim()) return;
    const gid = genId();
    const next = { ...structure, groupsByCategory: { ...structure.groupsByCategory, [category.id]: [...groups, { id: gid, name: name.trim() }] } };
    onChange(next);
    onCreateGroupContent(gid);
    setName(""); setAdding(false);
  };

  const removeGroup = (gid) => {
    onChange({ ...structure, groupsByCategory: { ...structure.groupsByCategory, [category.id]: groups.filter((g) => g.id !== gid) } });
  };

  const renameGroup = (gid, newName) => {
    onChange({ ...structure, groupsByCategory: { ...structure.groupsByCategory, [category.id]: groups.map((g) => g.id === gid ? { ...g, name: newName.trim() || g.name } : g) } });
    setRenamingGroupId(null);
  };

  const updateCategoryField = (field, value) => {
    onChange({ ...structure, categories: structure.categories.map((c) => c.id === category.id ? { ...c, [field]: value } : c) });
  };

  const groupIds = groups.map((g) => g.id);
  const reorderGroups = useCallback((newIdOrder) => {
    const byId = Object.fromEntries(groups.map((g) => [g.id, g]));
    onChange({ ...structure, groupsByCategory: { ...structure.groupsByCategory, [category.id]: newIdOrder.map((id) => byId[id]) } });
  }, [structure, onChange, groups, category.id]);
  const dnd = useDragReorder(groupIds, reorderGroups);

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm mb-4" style={{ color: "#8C8480" }}>
        <ChevronLeft size={16} /> 카테고리
      </button>
      <h1 className="font-display text-2xl font-bold flex items-center gap-2 mb-5"><span>{category.icon}</span>{category.name}</h1>

      <div className="mb-4">
        <MemoBox value={category.memo || ""} onChange={(v) => updateCategoryField("memo", v)} />
      </div>
      <div className="mb-6">
        <NotesBox
          budgetNote={category.budgetNote}
          scheduleNote={category.scheduleNote}
          onChangeBudget={(v) => updateCategoryField("budgetNote", v)}
          onChangeSchedule={(v) => updateCategoryField("scheduleNote", v)}
        />
      </div>

      <p className="text-sm font-bold mb-3">그룹 ({groups.length})</p>

      <div className="flex flex-wrap gap-2 mb-6">
        {dnd.order.map((gid) => {
          const g = groups.find((gg) => gg.id === gid);
          if (!g) return null;
          const isRenaming = renamingGroupId === g.id;
          return (
            <DragRow key={g.id} id={g.id} dnd={dnd} className="rounded-full overflow-visible">
              <div className="flex items-center gap-1.5 rounded-full pl-4 pr-1.5 py-1.5 text-sm" style={{ background: "#FFFFFF", border: "1px solid #ECE7E4" }}>
                {isRenaming ? (
                  <input
                    autoFocus
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && renameGroup(g.id, renameDraft)}
                    onBlur={() => renameGroup(g.id, renameDraft)}
                    className="border rounded px-1.5 py-0.5 text-sm w-28"
                    style={{ borderColor: "#ECE7E4" }}
                  />
                ) : (
                  <button onClick={() => onOpenGroup(g.id)} className="font-medium">{g.name}</button>
                )}
                <span className="p-1 rounded-full" style={{ color: "#D8CFCB", cursor: "grab" }}><Menu size={14} /></span>
              </div>
            </DragRow>
          );
        })}
        {adding ? (
          <div className="flex items-center gap-1">
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addGroup()} placeholder="예: A스튜디오" className="border rounded-full px-3 py-1.5 text-sm w-36" style={{ borderColor: "#ECE7E4" }} />
            <button onClick={addGroup} className="px-2 py-1.5 rounded-full text-xs text-white" style={{ background: "#7C8B6F" }}>추가</button>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="flex items-center gap-1 rounded-full px-4 py-1.5 text-sm" style={{ border: "1px dashed #D8CFCB", color: "#8C8480" }}>
            <Plus size={14} /> 그룹 추가
          </button>
        )}
      </div>

      {groups.length === 0 && !adding && (
        <div className="rounded-xl p-8 text-center" style={{ background: "#FFFFFF", border: "1px dashed #ECE7E4", color: "#ABA39D" }}>
          아직 그룹이 없어요. 업체명이나 스타일명으로 그룹을 만들어보세요.
        </div>
      )}
      <div className="flex flex-col gap-3">
        {groups.map((g) => {
          const photos = (groupContents?.[g.id]?.photos || []).slice(0, 3);
          const slots = [photos[0] || null, photos[1] || null, photos[2] || null];
          return (
            <div key={g.id} className="rounded-xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #ECE7E4" }}>
              <div className="flex flex-col md:flex-row md:items-center" style={{ paddingTop: 24, paddingBottom: 24 }}>
                <div className="flex items-center px-4 md:flex-1 md:min-w-0">
                  <button onClick={() => onOpenGroup(g.id)} className="flex-1 text-left min-w-0">
                    <p className="font-medium text-sm truncate">{g.name}</p>
                  </button>
                  <div className="md:hidden flex items-center shrink-0">
                    <ActionMenu
                      onEdit={() => { setRenamingGroupId(g.id); setRenameDraft(g.name); }}
                      onDelete={() => removeGroup(g.id)}
                      deleteLabel="정말로 이 그룹을 삭제하시겠어요?"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 md:px-3 mt-3 md:mt-0 shrink-0">
                  {slots.map((p, i) => (
                    p ? (
                      <img key={i} src={p.dataUrl} alt="" className="rounded-lg object-cover shrink-0" style={{ width: 80, height: 80 }} />
                    ) : (
                      <div key={i} className="rounded-lg shrink-0" style={{ width: 80, height: 80, background: "#F6F6F6", border: "1px dashed #D8CFCB" }} />
                    )
                  ))}
                </div>
                <div className="hidden md:flex items-center px-2 shrink-0">
                  <ActionMenu
                    onEdit={() => { setRenamingGroupId(g.id); setRenameDraft(g.name); }}
                    onDelete={() => removeGroup(g.id)}
                    deleteLabel="정말로 이 그룹을 삭제하시겠어요?"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
function sectionStyle(title) {
  if (title.includes("확정")) return { badge: "#7C8B6F", bg: "#F1F4EE" };
  if (title.includes("결정")) return { badge: "#C08A3E", bg: "#FBF3E7" };
  return { badge: "#9C8F80", bg: "#F3EFEC" };
}

function MemoBox({ value, onChange }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "#FFFFFF", border: "1px solid #ECE7E4" }}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="간단한 메모를 남겨보세요."
        rows={4}
        className="w-full text-sm bg-transparent resize-y"
        style={{ color: "#2B2622" }}
      />
    </div>
  );
}

function NotesBox({ budgetNote, scheduleNote, onChangeBudget, onChangeSchedule }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <div className="rounded-xl p-4" style={{ background: "#FFFFFF", border: "1px solid #ECE7E4" }}>
        <p className="text-xs font-bold mb-2" style={{ color: "#8C8480" }}>💰 예산 메모</p>
        <input value={budgetNote || ""} onChange={(e) => onChangeBudget(e.target.value)} placeholder="예: 총 250만원 예상" className="w-full text-sm bg-transparent" />
      </div>
      <div className="rounded-xl p-4" style={{ background: "#FFFFFF", border: "1px solid #ECE7E4" }}>
        <p className="text-xs font-bold mb-2" style={{ color: "#8C8480" }}>📅 일정 메모</p>
        <input value={scheduleNote || ""} onChange={(e) => onChangeSchedule(e.target.value)} placeholder="예: 9월 15일 상담 예약" className="w-full text-sm bg-transparent" />
      </div>
    </div>
  );
}

function ShareGroupLinkModal({ code, groupId, groupName, onClose }) {
  const [copied, setCopied] = useState(false);
  let link = "";
  try { link = window.location.origin + "/share/" + code + "/" + groupId; } catch {}

  const copy = async () => {
    const ok = await copyToClipboard(link);
    setCopied(ok ? "복사됨" : "복사 실패");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(30,24,22,0.45)" }}>
      <div className="rounded-2xl p-5 w-full max-w-sm" style={{ background: "#FFFFFF" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-sm">'{groupName}' 공유 링크</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-50" style={{ color: "#ABA39D" }}><X size={16} /></button>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input readOnly value={link} className="flex-1 min-w-0 border rounded-lg px-3 py-2 text-xs" style={{ borderColor: "#ECE7E4", color: "#6B6157" }} />
          <button onClick={copy} className="text-xs px-3 py-2 rounded-lg shrink-0" style={{ background: "#F9EEEE", color: "#C17272" }}>{copied || "복사"}</button>
        </div>
        <p className="text-[11px]" style={{ color: "#ABA39D" }}>이 링크는 로그인이나 앱 없이 누구나 브라우저에서 바로 열람할 수 있어요(메모+사진, 보기 전용). 업체 담당자분께 그대로 보내시면 돼요.</p>
      </div>
    </div>
  );
}

function GroupDetailView({ category, group, content, activeCode, onBack, onSave, onRenameGroup, openLightbox }) {
  const [local, setLocal] = useState(content);
  const [uploading, setUploading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(group?.name || "");
  const [sharing, setSharing] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => setLocal(content), [group?.id]);

  const commit = (next) => { setLocal(next); onSave(next); };

  const memoSection = local.memoSections?.[0] || { id: genId(), title: "메모", content: "" };
  const updateMemo = (value) => {
    const exists = local.memoSections && local.memoSections.length > 0;
    const nextSections = exists
      ? local.memoSections.map((s, i) => i === 0 ? { ...s, content: value } : s)
      : [{ ...memoSection, content: value }];
    commit({ ...local, memoSections: nextSections });
  };

  const handleFiles = async (files) => {
    setUploading(true);
    try {
      const newPhotos = [];
      for (const file of Array.from(files).slice(0, 10)) {
        if (!file.type.startsWith("image/")) continue;
        const dataUrl = await compressImage(file);
        newPhotos.push({ id: genId(), dataUrl, caption: "" });
      }
      commit({ ...local, photos: [...local.photos, ...newPhotos] });
    } catch (e) {
      // 실패해도 조용히 스킵
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (id) => commit({ ...local, photos: local.photos.filter((p) => p.id !== id) });

  if (!group) return null;

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm mb-4" style={{ color: "#8C8480" }}>
        <ChevronLeft size={16} /> {category.name}
      </button>

      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {editingName ? (
              <input autoFocus value={nameDraft} onChange={(e) => setNameDraft(e.target.value)}
                onBlur={() => { onRenameGroup(nameDraft.trim() || group.name); setEditingName(false); }}
                onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                className="font-display text-2xl font-bold border-b bg-transparent" style={{ borderColor: "#D8CFCB" }} />
            ) : (
              <h1 className="font-display text-2xl font-bold truncate">{group.name}</h1>
            )}
            <button onClick={() => setEditingName(true)} className="p-1.5 rounded hover:bg-gray-100 shrink-0" style={{ color: "#ABA39D" }}><Pencil size={15} /></button>
          </div>
          <button onClick={() => setSharing(true)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg shrink-0" style={{ background: "#F3EFEC", color: "#6B6157" }}>
            <Send size={12} /> 공유
          </button>
        </div>
      </div>

      <div className="mb-6">
        <MemoBox value={memoSection.content} onChange={updateMemo} />
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold">사진 ({local.photos.length})</p>
        <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg text-white" style={{ background: "#C17272" }}>
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />} 사진 추가
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files.length && handleFiles(e.target.files)} />
      </div>

      {local.photos.length === 0 ? (
        <div onClick={() => fileRef.current?.click()} className="rounded-xl p-10 text-center cursor-pointer" style={{ background: "#FFFFFF", border: "1px dashed #ECE7E4", color: "#ABA39D" }}>
          레퍼런스 사진을 모아보세요. 탭해서 업로드하세요.
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {local.photos.map((p, idx) => (
            <div key={p.id} className="relative group aspect-square rounded-lg overflow-hidden" style={{ background: "#F1ECEA" }}>
              <img src={p.dataUrl} alt="" className="w-full h-full object-cover cursor-pointer" onClick={() => openLightbox(local.photos, idx)} />
              <button onClick={() => removePhoto(p.id)} className="absolute top-1 right-1 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.55)" }}>
                <X size={12} color="white" />
              </button>
            </div>
          ))}
        </div>
      )}
      {sharing && (
        <ShareGroupLinkModal code={activeCode} groupId={group.id} groupName={group.name} onClose={() => setSharing(false)} />
      )}
    </div>
  );
}

function Lightbox({ photos, startIdx, onClose }) {
  const [idx, setIdx] = useState(startIdx);
  const photo = photos[idx];
  const showArrows = photos.length > 1;
  const prev = () => setIdx((i) => (i - 1 + photos.length) % photos.length);
  const next = () => setIdx((i) => (i + 1) % photos.length);

  const dragStartX = useRef(null);
  const onPointerDown = (e) => { dragStartX.current = e.clientX; };
  const onPointerUp = (e) => {
    if (dragStartX.current == null) return;
    const delta = e.clientX - dragStartX.current;
    dragStartX.current = null;
    if (!showArrows) return;
    if (delta > 50) prev();
    else if (delta < -50) next();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(20,16,14,0.9)", touchAction: "pan-y" }}>
      <button className="absolute top-5 right-5 z-10 p-2 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} onClick={onClose}><X color="white" size={20} /></button>
      {showArrows && (
        <button onClick={prev} className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full text-white/70 hover:text-white" style={{ background: "rgba(255,255,255,0.1)" }}>
          <ChevronLeft size={28} />
        </button>
      )}
      <div
        className="flex items-center justify-center w-full h-full select-none"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        style={{ touchAction: "pan-y" }}
      >
        <img src={photo.dataUrl} alt="" draggable={false} className="max-h-[80vh] max-w-[80vw] rounded-lg object-contain" />
      </div>
      {showArrows && (
        <button onClick={next} className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full text-white/70 hover:text-white" style={{ background: "rgba(255,255,255,0.1)" }}>
          <ChevronLeft size={28} className="rotate-180" />
        </button>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   스케줄
--------------------------------------------------------------- */
function DayEventsModal({ date, tasks, categories, onDelete, onAdd, onEditTask, onReorderDate, onClose }) {
  const [title, setTitle] = useState("");
  const [catId, setCatId] = useState("");
  const [renamingId, setRenamingId] = useState(null);
  const [renameCatId, setRenameCatId] = useState("");
  const [renameDraft, setRenameDraft] = useState("");
  const taskIds = tasks.map((t) => t.id);
  const dnd = useDragReorder(taskIds, onReorderDate);

  const submit = () => { if (title.trim()) { onAdd(title, catId); setTitle(""); } };
  const startRename = (t) => { setRenamingId(t.id); setRenameDraft(t.title); setRenameCatId(t.categoryId || ""); };
  const saveRename = () => {
    if (renameDraft.trim()) onEditTask(renamingId, { title: renameDraft, categoryId: renameCatId || null });
    setRenamingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(30,24,22,0.45)" }}>
      <div className="rounded-2xl p-5 w-full max-w-sm" style={{ background: "#FFFFFF" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-mono text-xs" style={{ color: "#8C8480" }}>{date} · {itemDday(date)}</p>
            <h2 className="font-bold text-sm mt-0.5">이 날의 일정</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-50" style={{ color: "#ABA39D" }}><X size={16} /></button>
        </div>

        <div className="flex items-center gap-1.5 mb-4">
          <select value={catId} onChange={(e) => setCatId(e.target.value)} className="border rounded-lg py-2 text-xs shrink-0 w-[86px]" style={{ borderColor: "#ECE7E4" }}>
            <option value="">카테고리</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="할 일" className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-0" style={{ borderColor: "#ECE7E4" }} />
          <button onClick={submit} className="px-3 py-2 rounded-lg text-sm text-white shrink-0" style={{ background: "#C17272" }}>추가</button>
        </div>

        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto scrollbar-thin">
          {dnd.order.length === 0 && <p className="text-sm text-center py-4" style={{ color: "#ABA39D" }}>이 날은 일정이 없어요.</p>}
          {dnd.order.map((tid) => {
            const t = tasks.find((tt) => tt.id === tid);
            if (!t) return null;
            const cat = categories.find((c) => c.id === t.categoryId);
            const isRenaming = renamingId === t.id;

            if (isRenaming) {
              return (
                <div key={t.id} className="flex items-center gap-1.5 rounded-lg px-2 py-2" style={{ background: "#F3EFEC" }}>
                  <select value={renameCatId} onChange={(e) => setRenameCatId(e.target.value)} className="border rounded-lg py-1.5 text-xs shrink-0 w-[86px]" style={{ borderColor: "#ECE7E4" }}>
                    <option value="">카테고리</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                  <input
                    autoFocus
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveRename()}
                    placeholder="할 일"
                    className="border rounded-lg px-2 py-1.5 text-sm flex-1 min-w-0"
                    style={{ borderColor: "#ECE7E4" }}
                  />
                  <button onClick={saveRename} className="px-3 py-1.5 rounded-lg text-xs text-white shrink-0" style={{ background: "#C17272" }}>저장</button>
                </div>
              );
            }

            return (
              <DragRow key={t.id} id={t.id} dnd={dnd} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5" style={{ background: "#F3EFEC" }}>
                <span className="text-base shrink-0">{cat?.icon || "📋"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs mb-0.5" style={{ color: "#ABA39D" }}>{cat ? cat.name : "카테고리 없음"}</p>
                  <p className="text-sm font-bold truncate" style={{ color: "#2B2622" }}>{t.title}</p>
                </div>
                <ActionMenu
                  onEdit={() => startRename(t)}
                  onDelete={() => onDelete(t.id)}
                  deleteLabel="정말로 이 일정을 삭제하시겠어요?"
                />
              </DragRow>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MonthJumpModal({ year, month, onJump, onClose }) {
  const [y, setY] = useState(year);
  const months = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(30,24,22,0.45)" }}>
      <div className="rounded-2xl p-5 w-full max-w-xs" style={{ background: "#FFFFFF" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-center gap-4 mb-4">
          <button onClick={() => setY(y - 1)} className="p-1.5 rounded hover:bg-gray-50" style={{ color: "#8C8480" }}><ChevronLeft size={18} /></button>
          <span className="font-mono font-bold text-sm">{y}년</span>
          <button onClick={() => setY(y + 1)} className="p-1.5 rounded hover:bg-gray-50 rotate-180" style={{ color: "#8C8480" }}><ChevronLeft size={18} /></button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {months.map((m, i) => (
            <button
              key={m}
              onClick={() => { onJump(y, i); onClose(); }}
              className="py-2 rounded-lg text-sm"
              style={{ background: y === year && i === month ? "#C17272" : "#F3EFEC", color: y === year && i === month ? "#FFFFFF" : "#2B2622" }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScheduleView({ structure, onChange }) {
  const [monthCursor, setMonthCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [openDate, setOpenDate] = useState(null);
  const [jumping, setJumping] = useState(false);
  const card = { background: "#FFFFFF", border: "1px solid #ECE7E4" };

  const addTask = (date, title, catId) => onChange({ ...structure, schedule: [...structure.schedule, { id: genId(), title: title.trim(), date, done: false, categoryId: catId || null, memo: "" }] });
  const toggle = (id) => onChange({ ...structure, schedule: structure.schedule.map((t) => t.id === id ? { ...t, done: !t.done } : t) });
  const remove = (id) => onChange({ ...structure, schedule: structure.schedule.filter((t) => t.id !== id) });
  const editTask = (id, { title: newTitle, categoryId }) => onChange({ ...structure, schedule: structure.schedule.map((t) => t.id === id ? { ...t, title: (newTitle ?? t.title).trim() || t.title, categoryId: categoryId !== undefined ? categoryId : t.categoryId } : t) });
  const reorderDate = (date, newIdOrder) => {
    const sameDateIdx = structure.schedule.map((t, i) => (t.date === date ? i : -1)).filter((i) => i !== -1);
    const arr = [...structure.schedule];
    newIdOrder.forEach((id, pos) => {
      arr[sameDateIdx[pos]] = structure.schedule.find((t) => t.id === id);
    });
    onChange({ ...structure, schedule: arr });
  };

  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(startWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const weekday = ["일", "월", "화", "수", "목", "금", "토"];

  const tasksByDate = {};
  structure.schedule.forEach((t) => { (tasksByDate[t.date] = tasksByDate[t.date] || []).push(t); });
  const changeMonth = (delta) => { const d = new Date(monthCursor); d.setMonth(d.getMonth() + delta); setMonthCursor(d); };
  const jumpTo = (y, m) => setMonthCursor(new Date(y, m, 1));
  const pad = (n) => String(n).padStart(2, "0");
  const MAX_CHIPS = 4;
  const CELL_HEIGHT = 112;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-5">스케줄</h1>

      <div className="rounded-2xl p-3 md:p-5" style={card}>
        <div className="flex items-center justify-center gap-4 mb-4">
          <button onClick={() => changeMonth(-1)} className="p-1.5 rounded hover:bg-gray-50" style={{ color: "#8C8480" }}><ChevronLeft size={18} /></button>
          <button onClick={() => setJumping(true)} className="font-bold font-mono text-sm px-2 py-1 rounded hover:bg-gray-50">{year}. {pad(month + 1)}</button>
          <button onClick={() => changeMonth(1)} className="p-1.5 rounded hover:bg-gray-50 rotate-180" style={{ color: "#8C8480" }}><ChevronLeft size={18} /></button>
        </div>
        <div className="grid grid-cols-7 border-b" style={{ borderColor: "#ECE7E4" }}>
          {weekday.map((w, i) => (
            <div key={w} className="min-w-0 text-center text-xs py-2 font-medium" style={{ color: i === 6 ? "#7C93A8" : "#8C8480" }}>{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const isLastCol = i % 7 === 6;
            const isLastRow = i >= Math.floor((cells.length - 1) / 7) * 7;
            const edgeClass = `${isLastRow ? "" : "border-b"} ${isLastCol ? "" : "border-r"}`;
            if (d === null) return <div key={i} className={"min-w-0 " + edgeClass} style={{ height: CELL_HEIGHT, borderColor: "#F3EFEC" }} />;
            const iso = `${year}-${pad(month + 1)}-${pad(d)}`;
            const isToday = iso === todayISO();
            const dayT = (tasksByDate[iso] || []).sort((a, b) => a.done - b.done);
            const weekdayIdx = (startWeekday + d - 1) % 7;
            const overflow = dayT.length > MAX_CHIPS;
            const visibleCount = overflow ? MAX_CHIPS - 1 : dayT.length;
            return (
              <button
                key={i}
                onClick={() => setOpenDate(iso)}
                className={`min-w-0 p-1 md:p-1.5 flex flex-col items-start gap-0.5 text-left hover:bg-gray-50/50 transition-colors overflow-hidden ${edgeClass}`}
                style={{ height: CELL_HEIGHT, borderColor: "#F3EFEC" }}
              >
                <span
                  className="text-xs font-mono w-5 h-5 flex items-center justify-center rounded-full mb-0.5 shrink-0"
                  style={{
                    background: isToday ? "#C17272" : "transparent",
                    color: isToday ? "#FFFFFF" : weekdayIdx === 6 ? "#7C93A8" : "#2B2622",
                    fontWeight: isToday ? 700 : 400,
                  }}
                >
                  {d}
                </span>
                {dayT.slice(0, visibleCount).map((t) => (
                  <span
                    key={t.id}
                    className="text-[10px] md:text-xs w-full truncate rounded px-1 py-[1px]"
                    style={{
                      background: t.done ? "#F1ECEA" : "#F9EEEE",
                      color: t.done ? "#ABA39D" : "#5A2F2F",
                      textDecoration: t.done ? "line-through" : "none",
                    }}
                  >
                    {t.title}
                  </span>
                ))}
                {overflow && (
                  <span className="text-[10px]" style={{ color: "#ABA39D" }}>+{dayT.length - visibleCount}개</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {jumping && (
        <MonthJumpModal year={year} month={month} onJump={jumpTo} onClose={() => setJumping(false)} />
      )}

      {openDate && (
        <DayEventsModal
          date={openDate}
          tasks={tasksByDate[openDate] || []}
          categories={structure.categories}
          onToggle={toggle}
          onDelete={remove}
          onAdd={(title, catId) => addTask(openDate, title, catId)}
          onEditTask={editTask}
          onReorderDate={(newIdOrder) => reorderDate(openDate, newIdOrder)}
          onClose={() => setOpenDate(null)}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   가계부
--------------------------------------------------------------- */
const CHART_COLORS = ["#C17272", "#DCA1A1", "#7C93A8", "#7C8B6F", "#C08A3E", "#B08968", "#9C8F80", "#8FA8C7"];

function PieTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg px-3 py-2 text-xs" style={{ background: "#2B2622", color: "#FFFFFF" }}>
      <p className="font-medium mb-0.5">{d.icon} {d.name}</p>
      <p>{fmtWon(d.value)} · {d.pct}%</p>
    </div>
  );
}

function BudgetFormModal({ categories, initial, shareMeta, onSubmit, onClose }) {
  const [form, setForm] = useState({ payer: null, ...initial });
  const noSpinner = { WebkitAppearance: "none", MozAppearance: "textfield" };
  const hasPayers = !!(shareMeta?.userA || shareMeta?.userB);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(30,24,22,0.45)" }}>
      <div className="rounded-2xl p-5 w-full max-w-sm" style={{ background: "#FFFFFF" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-sm">{initial.id ? "지출 내역 수정" : "지출 내역 추가"}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-50" style={{ color: "#ABA39D" }}><X size={16} /></button>
        </div>
        <div className="flex flex-col gap-2.5 mb-4">
          {hasPayers && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs shrink-0" style={{ color: "#8C8480" }}>결제 담당자</span>
              {shareMeta.userA && (
                <button onClick={() => setForm({ ...form, payer: form.payer === "A" ? null : "A" })} className="text-xs px-2.5 py-1 rounded-full" style={{ background: form.payer === "A" ? "#C17272" : "#F3EFEC", color: form.payer === "A" ? "#FFFFFF" : "#6B6157" }}>{shareMeta.userA}</button>
              )}
              {shareMeta.userB && (
                <button onClick={() => setForm({ ...form, payer: form.payer === "B" ? null : "B" })} className="text-xs px-2.5 py-1 rounded-full" style={{ background: form.payer === "B" ? "#C17272" : "#F3EFEC", color: form.payer === "B" ? "#FFFFFF" : "#6B6157" }}>{shareMeta.userB}</button>
              )}
            </div>
          )}
          <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 150px" }}>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="border rounded-lg px-2 py-2 text-sm w-full" style={{ borderColor: "#ECE7E4" }}>
              {categories.map((c) => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
            </select>
            <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="border rounded-lg px-3 py-2 text-sm w-full" style={{ borderColor: "#ECE7E4" }} />
          </div>
          <input value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} placeholder="항목 (예: 계약금)" className="border rounded-lg px-3 py-2 text-sm w-full" style={{ borderColor: "#ECE7E4" }} />
          <div className="relative w-full">
            <input type="number" value={form.actual} onChange={(e) => setForm({ ...form, actual: e.target.value })} placeholder="지출 금액" className="border rounded-lg pl-3 pr-7 py-2 text-sm w-full" style={{ borderColor: "#ECE7E4", ...noSpinner }} />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: "#ABA39D" }}>원</span>
          </div>
        </div>
        <button
          onClick={() => { if (form.item.trim()) onSubmit(form); }}
          className="w-full py-2.5 rounded-lg text-sm font-medium text-white"
          style={{ background: "#C17272" }}
        >
          {initial.id ? "저장" : "추가"}
        </button>
      </div>
    </div>
  );
}

function BudgetView({ structure, onChange, shareMeta }) {
  const [filters, setFilters] = useState(new Set());
  const [formState, setFormState] = useState(null); // null | {} (new) | budget item (edit)
  const [showPayerInfo, setShowPayerInfo] = useState(false);

  const addOrUpdate = (form) => {
    if (form.id) {
      onChange({ ...structure, budget: structure.budget.map((b) => b.id === form.id ? { ...b, category: form.category, item: form.item, actual: Number(form.actual) || 0, dueDate: form.dueDate, payer: form.payer || null } : b) });
    } else {
      onChange({ ...structure, budget: [...structure.budget, { id: genId(), category: form.category, item: form.item, planned: 0, actual: Number(form.actual) || 0, dueDate: form.dueDate, payer: form.payer || null }] });
    }
    setFormState(null);
  };
  const remove = (id) => onChange({ ...structure, budget: structure.budget.filter((b) => b.id !== id) });

  const toggleFilter = (name) => {
    setFilters((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const totalActual = structure.budget.reduce((s, b) => s + b.actual, 0);

  const byCategory = {};
  structure.budget.forEach((b) => { byCategory[b.category] = (byCategory[b.category] || 0) + b.actual; });

  const chartData = Object.entries(byCategory)
    .map(([cat, amt]) => ({
      name: cat,
      value: amt,
      icon: structure.categories.find((c) => c.name === cat)?.icon || "📋",
      pct: totalActual > 0 ? Math.round((amt / totalActual) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value)
    .map((d, i) => ({ ...d, color: CHART_COLORS[i % CHART_COLORS.length] }));

  const hasPayers = !!(shareMeta?.userA || shareMeta?.userB);
  const payerTotals = { A: 0, B: 0, none: 0 };
  structure.budget.forEach((b) => {
    if (b.payer === "A") payerTotals.A += b.actual;
    else if (b.payer === "B") payerTotals.B += b.actual;
    else payerTotals.none += b.actual;
  });
  const payerRows = [
    shareMeta?.userA && { name: shareMeta.userA, amt: payerTotals.A },
    shareMeta?.userB && { name: shareMeta.userB, amt: payerTotals.B },
    payerTotals.none > 0 && { name: "미지정", amt: payerTotals.none },
  ].filter(Boolean).map((r) => ({ ...r, pct: totalActual > 0 ? Math.round((r.amt / totalActual) * 100) : 0 }));

  const filteredBudget = structure.budget.filter((b) => filters.size === 0 ? true : filters.has(b.category));

  return (
    <div>
      <h1 className="font-display text-2xl font-bold mb-5">가계부</h1>

      <div className="rounded-xl p-5 mb-5" style={{ background: "#FFFFFF", border: "1px solid #ECE7E4" }}>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-1 mb-1 relative">
              <p className="text-xs" style={{ color: "#8C8480" }}>총 지출</p>
              {hasPayers && (
                <span
                  onMouseEnter={() => setShowPayerInfo(true)}
                  onMouseLeave={() => setShowPayerInfo(false)}
                  className="relative cursor-default"
                  style={{ color: "#ABA39D" }}
                >
                  <Info size={12} />
                  {showPayerInfo && (
                    <div className="absolute left-0 top-5 z-20 rounded-lg px-3 py-2 text-xs whitespace-nowrap" style={{ background: "#2B2622", color: "#FFFFFF" }}>
                      {payerRows.map((r) => (
                        <p key={r.name}>{r.name} · {fmtWon(r.amt)} · {r.pct}%</p>
                      ))}
                    </div>
                  )}
                </span>
              )}
            </div>
            <p className="font-mono text-2xl font-bold">{fmtWon(totalActual)}</p>
          </div>
          {chartData.length > 0 && (
            <div style={{ width: 120, height: 120 }} className="shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={32} outerRadius={56} paddingAngle={2} startAngle={90} endAngle={-270}>
                    {chartData.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div style={{ borderTop: "1px solid #ECE7E4", margin: "16px 0" }} />

        {chartData.length === 0 ? (
          <p className="text-sm" style={{ color: "#ABA39D" }}>등록된 지출이 없어요.</p>
        ) : (
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {chartData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                <span style={{ color: "#6B6157" }}>{d.icon} {d.name} {d.pct}%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-sm">지출 내역</h2>
        <button
          onClick={() => setFormState({ category: structure.categories[0]?.name || "", item: "", actual: "", dueDate: todayISO(), payer: null })}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg text-white shrink-0"
          style={{ background: "#C17272" }}
        >
          <Plus size={13} /> 지출내역 추가
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        <button onClick={() => setFilters(new Set())} className="text-xs px-3 py-1.5 rounded-full" style={{ background: filters.size === 0 ? "#C17272" : "#FFFFFF", color: filters.size === 0 ? "#FFFFFF" : "#8C8480", border: "1px solid #ECE7E4" }}>전체</button>
        {structure.categories.map((c) => (
          <button key={c.id} onClick={() => toggleFilter(c.name)} className="text-xs px-3 py-1.5 rounded-full" style={{ background: filters.has(c.name) ? "#C17272" : "#FFFFFF", color: filters.has(c.name) ? "#FFFFFF" : "#8C8480", border: "1px solid #ECE7E4" }}>
            {c.icon} {c.name}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {filteredBudget.length === 0 && <p className="text-sm text-center py-8" style={{ color: "#ABA39D" }}>지출 내역이 없어요.</p>}
        {filteredBudget.sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map((b) => {
          const cat = structure.categories.find((c) => c.name === b.category);
          const payerName = b.payer === "A" ? shareMeta?.userA : b.payer === "B" ? shareMeta?.userB : null;
          return (
            <div key={b.id} className="flex items-center gap-3 rounded-xl px-4 py-3.5" style={{ background: "#FFFFFF", border: "1px solid #ECE7E4" }}>
              <span className="text-lg shrink-0">{cat?.icon || "📋"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: "#2B2622" }}>{b.item}</p>
                <p className="text-xs mt-0.5" style={{ color: "#ABA39D" }}>{b.category} · {b.dueDate}{payerName ? ` · ${payerName}` : ""}</p>
              </div>
              <p className="font-mono text-base font-bold shrink-0" style={{ color: "#C17272" }}>{fmtWon(b.actual)}</p>
              <button onClick={() => setFormState(b)} className="p-1.5 rounded hover:bg-gray-50 shrink-0" style={{ color: "#ABA39D" }}><Pencil size={14} /></button>
              <ConfirmIconButton onDelete={() => remove(b.id)} label="정말로 이 지출 내역을 삭제하시겠어요?" />
            </div>
          );
        })}
      </div>

      {formState && (
        <BudgetFormModal
          categories={structure.categories}
          initial={formState}
          shareMeta={shareMeta}
          onSubmit={addOrUpdate}
          onClose={() => setFormState(null)}
        />
      )}
    </div>
  );
}
