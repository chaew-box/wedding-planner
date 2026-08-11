"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";

function Lightbox({ photos, startIdx, onClose }) {
  const [idx, setIdx] = useState(startIdx);
  const photo = photos[idx];
  const showArrows = photos.length > 1;
  const prev = () => setIdx((i) => (i - 1 + photos.length) % photos.length);
  const next = () => setIdx((i) => (i + 1) % photos.length);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(20,16,14,0.9)" }}>
      <button className="absolute top-5 right-5 z-10 p-2 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} onClick={onClose}>✕</button>
      {showArrows && (
        <button onClick={prev} className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full text-white/80" style={{ background: "rgba(255,255,255,0.1)" }}>‹</button>
      )}
      <img src={photo.dataUrl} alt="" className="max-h-[80vh] max-w-[80vw] rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
      {showArrows && (
        <button onClick={next} className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full text-white/80" style={{ background: "rgba(255,255,255,0.1)" }}>›</button>
      )}
    </div>
  );
}

export default function ShareGroupPage({ params }) {
  const { code, groupId } = params;
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categoryIcon, setCategoryIcon] = useState("");
  const [title, setTitle] = useState("");
  const [memo, setMemo] = useState("");
  const [photos, setPhotos] = useState([]);
  const [lightboxIdx, setLightboxIdx] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: ws } = await supabase.from("workspaces").select("title, categories, groups_by_category").eq("code", code).maybeSingle();
        const { data: gc } = await supabase.from("group_contents").select("*").eq("code", code).eq("group_id", groupId).maybeSingle();
        if (!ws || !gc) { setNotFound(true); setLoading(false); return; }

        let gName = "", catName = "", catIcon = "";
        const groupsByCat = ws.groups_by_category || {};
        for (const [catId, groups] of Object.entries(groupsByCat)) {
          const found = (groups || []).find((g) => g.id === groupId);
          if (found) {
            gName = found.name;
            const cat = (ws.categories || []).find((c) => c.id === catId);
            if (cat) { catName = cat.name; catIcon = cat.icon; }
            break;
          }
        }
        if (!gName) { setNotFound(true); setLoading(false); return; }

        setTitle(ws.title || "");
        setGroupName(gName);
        setCategoryName(catName);
        setCategoryIcon(catIcon);
        setMemo((gc.memo_sections && gc.memo_sections[0] && gc.memo_sections[0].content) || "");
        setPhotos(gc.photos || []);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [code, groupId]);

  const fontStyle = { fontFamily: "'Pretendard Variable', Pretendard, -apple-system, sans-serif" };

  if (loading) {
    return (
      <div style={{ ...fontStyle, background: "#FCFAFA" }} className="min-h-screen flex items-center justify-center">
        <p className="text-sm" style={{ color: "#8C8480" }}>불러오는 중...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ ...fontStyle, background: "#FCFAFA" }} className="min-h-screen flex items-center justify-center p-6">
        <p className="text-sm text-center" style={{ color: "#8C8480" }}>페이지를 찾을 수 없어요.<br />공유 링크가 정확한지 확인해주세요.</p>
      </div>
    );
  }

  return (
    <div style={{ ...fontStyle, background: "#FCFAFA", color: "#2B2622" }} className="min-h-screen">
      <style>{`@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css');`}</style>
      <div className="max-w-2xl mx-auto px-5 py-10">
        <p className="text-xs mb-1" style={{ color: "#ABA39D" }}>{title} · 공유 페이지 (보기 전용)</p>
        <h1 className="font-bold text-2xl mb-1">{categoryIcon} {categoryName} — {groupName}</h1>
        <div className="h-px my-6" style={{ background: "#ECE7E4" }} />

        {memo && (
          <div className="rounded-xl p-4 mb-6" style={{ background: "#FFFFFF", border: "1px solid #ECE7E4" }}>
            <p className="text-sm whitespace-pre-wrap">{memo}</p>
          </div>
        )}

        <p className="text-sm font-bold mb-3">사진 ({photos.length})</p>
        {photos.length === 0 ? (
          <p className="text-sm" style={{ color: "#ABA39D" }}>등록된 사진이 없어요.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <img
                key={p.id || i}
                src={p.dataUrl}
                alt=""
                onClick={() => setLightboxIdx(i)}
                className="rounded-lg object-cover cursor-pointer"
                style={{ width: "100%", aspectRatio: "1 / 1" }}
              />
            ))}
          </div>
        )}

        <p className="text-[11px] mt-10 text-center" style={{ color: "#D8CFCB" }}>Wedding Planner에서 공유된 페이지예요.</p>
      </div>

      {lightboxIdx !== null && (
        <Lightbox photos={photos} startIdx={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
    </div>
  );
}
