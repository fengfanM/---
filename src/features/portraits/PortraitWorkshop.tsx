import { useMemo, useState } from "react";
import { clearPortraitOverride, portraitUrlForId, setPortraitOverride } from "../../lib/gameAssets";

type CardLite = {
  id: string;
  name: string;
  rarity: "N" | "R" | "SR" | "SSR";
  element: string;
  keywords: string[];
};

function copyText(text: string) {
  const cb = navigator.clipboard?.writeText?.bind(navigator.clipboard);
  if (cb) return cb(text);
  return Promise.reject(new Error("clipboard unavailable"));
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function mjPromptFor(card: CardLite): string {
  const base =
    "original character, onmyoji-inspired, ukiyo-e mixed with modern high-end game card illustration, vibrant colors, high detail, clean linework, soft ink wash, gold foil accents, dramatic rim light, full body, dynamic pose, centered composition, no text, no watermark";

  const elem =
    card.element === "火"
      ? "fire element, maple leaves, ember glow"
      : card.element === "水"
        ? "water element, paper umbrella, flowing sleeves like water"
        : card.element === "金"
          ? "metal element, katana, sharp highlights"
          : card.element === "木"
            ? "wood element, sakura petals, ofuda talisman"
            : card.element === "土"
              ? "earth element, prayer beads, grounded stance"
              : "void element, fox mask, yin-yang seal barrier";

  const tier =
    card.rarity === "SSR"
      ? "extremely ornate ceremonial kimono, intricate gold embroidery, cinematic lighting"
      : card.rarity === "SR"
        ? "ornate kimono details, strong lighting, polished look"
        : card.rarity === "R"
          ? "detailed kimono, soft lighting"
          : "simple kimono, clean design";

  const mood = `${card.keywords[0] ?? ""}, ${card.keywords[1] ?? ""}`.trim().replace(/^,|,$/g, "");
  const name = `${card.name}(${card.id})`;

  const neg =
    "text, watermark, logo, lowres, blurry, jpeg artifacts, extra limbs, extra fingers, bad hands, deformed, cropped, out of frame, nsfw";

  return `/imagine prompt: ${name}, ${elem}, ${tier}, mood: ${mood}, ${base} --ar 9:13 --v 6 --stylize 250 --no ${neg}`;
}

export function PortraitWorkshop({ cards }: { cards: CardLite[] }) {
  const [open, setOpen] = useState(false);
  const [localFiles, setLocalFiles] = useState<Record<string, File | null>>({});
  const [localDataUrls, setLocalDataUrls] = useState<Record<string, string | null>>({});
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(() => {
    return cards.map((c) => {
      const existing = portraitUrlForId(c.id);
      const file = localFiles[c.id] ?? null;
      const localUrl = localDataUrls[c.id] ?? (file ? URL.createObjectURL(file) : null);
      const prompt = mjPromptFor(c);
      return { c, existing, file, localUrl, prompt };
    });
  }, [cards, localDataUrls, localFiles]);

  const allPrompts = useMemo(() => rows.map((r) => r.prompt).join("\n\n"), [rows]);

  return (
    <div className="panel portrait-workshop">
      <div className="portrait-head">
        <h2>立绘工坊（Midjourney）</h2>
        <div className="btn-row">
          {open && (
            <>
              <button
                type="button"
                className="btn btn-paper"
                onClick={() => {
                  setError(null);
                  copyText(allPrompts).catch(() => setError("复制失败：浏览器未授权剪贴板。"));
                }}
              >
                复制全部提示词
              </button>
              <button
                type="button"
                className="btn btn-paper"
                onClick={() => downloadText("midjourney_prompts.txt", allPrompts)}
              >
                下载 prompts.txt
              </button>
            </>
          )}
          <button type="button" className="btn btn-paper" onClick={() => setOpen(!open)}>
            {open ? "收起" : "展开"}
          </button>
        </div>
      </div>

      {open && (
        <>
          <div className="portrait-hint">
            生成后下载图片，上传到这里可自动重命名并下载成 <strong>&lt;cardId&gt;.png/.webp</strong>。
            然后把文件放进 <strong>src/assets/portraits/</strong>，图鉴/获卡弹窗/翻牌会自动生效。
          </div>

          <div className="portrait-meta">
            <div className="pull-chip">推荐画幅：9:13</div>
            <div className="pull-chip">建议：--v 6</div>
            <div className="pull-chip">建议：--stylize 250</div>
          </div>

          {error && <div className="portrait-error">{error}</div>}

          <div className="portrait-list">
            {rows.map(({ c, existing, file, localUrl, prompt }) => (
              <div key={c.id} className="portrait-row">
                <div className="portrait-preview">
                  <div
                    className={`portrait-img ${existing ? "has" : ""}`}
                    style={{
                      backgroundImage: `url("${localUrl ?? existing ?? ""}")`,
                    }}
                  />
                  <div className="portrait-cap">
                    <div className="portrait-id">{c.id}</div>
                    <div className="portrait-name">{c.name}</div>
                    <div className="portrait-tags">
                      <span className="portrait-tag">{c.rarity}</span>
                      <span className="portrait-tag">{c.element}</span>
                    </div>
                  </div>
                </div>

                <div className="portrait-actions">
                  <textarea className="portrait-prompt" readOnly value={prompt} />
                  <div className="btn-row">
                    <button
                      type="button"
                      className="btn btn-paper"
                      onClick={() => {
                        setError(null);
                        copyText(prompt).catch(() => setError("复制失败：浏览器未授权剪贴板。"));
                      }}
                    >
                      复制提示词
                    </button>
                    <label className="btn btn-paper" style={{ cursor: "pointer" }}>
                      上传图片
                      <input
                        type="file"
                        accept="image/png,image/webp,image/jpeg"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const f = e.currentTarget.files?.[0] ?? null;
                          setLocalFiles((s) => ({ ...s, [c.id]: f }));
                          if (f) {
                            const reader = new FileReader();
                            reader.onload = () => {
                              const v = typeof reader.result === "string" ? reader.result : null;
                              setLocalDataUrls((s) => ({ ...s, [c.id]: v }));
                            };
                            reader.readAsDataURL(f);
                          } else {
                            setLocalDataUrls((s) => ({ ...s, [c.id]: null }));
                          }
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      className="btn btn-paper"
                      disabled={!localUrl}
                      onClick={() => {
                        if (!localUrl) return;
                        setPortraitOverride(c.id, localUrl);
                      }}
                    >
                      应用到预览
                    </button>

                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={!file}
                      onClick={() => {
                        if (!file) return;
                        const ext = (file.name.split(".").pop() || "png").toLowerCase();
                        const a = document.createElement("a");
                        a.href = URL.createObjectURL(file);
                        a.download = `${c.id}.${ext}`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                      }}
                    >
                      下载重命名
                    </button>
                  </div>
                  <div className="portrait-note">
                    {existing ? "已检测到本地立绘文件" : "未检测到本地立绘文件"}
                  </div>
                  <div className="btn-row">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => clearPortraitOverride(c.id)}
                    >
                      清除预览覆盖
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
