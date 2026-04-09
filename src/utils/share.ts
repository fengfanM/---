export interface ShareContent {
  title: string;
  text: string;
  url?: string;
}

export async function shareContent(content: ShareContent): Promise<boolean> {
  try {
    if (navigator.share) {
      await navigator.share(content);
      return true;
    } else {
      await navigator.clipboard.writeText(`${content.title}\n\n${content.text}`);
      alert("已复制到剪贴板！");
      return true;
    }
  } catch (error) {
    console.error("分享失败:", error);
    try {
      await navigator.clipboard.writeText(`${content.title}\n\n${content.text}`);
      alert("已复制到剪贴板！");
      return true;
    } catch (clipboardError) {
      alert("分享失败，请手动复制分享内容");
      return false;
    }
  }
}

export function formatFortuneShare(dailyFortune: any): ShareContent {
  return {
    title: "🔮 天机抽卡 - 今日运势",
    text: `【今日运势】
签运：${dailyFortune.sign}
气运：${dailyFortune.mood}
幸运元素：${dailyFortune.luckElement}
幸运数：${dailyFortune.luckNumber}

指引：${dailyFortune.advice}

—— 来自「天机抽卡」`,
  };
}

export function formatPullShare(results: any[], poolName: string): ShareContent {
  const ssrCount = results.filter((r) => r.rarity === "SSR").length;
  const srCount = results.filter((r) => r.rarity === "SR").length;

  let resultText = "";
  if (results.length === 1) {
    resultText = `抽到了「${results[0].card.name}」(${results[0].rarity})！`;
  } else {
    resultText = `获得 ${ssrCount} 张 SSR，${srCount} 张 SR！`;
    if (results.length > 0) {
      const topCards = results.slice(0, 3).map((r) => r.card.name).join("、");
      resultText += ` 包含：${topCards}${results.length > 3 ? "…" : ""}`;
    }
  }

  return {
    title: "🎴 天机抽卡 - ${poolName}",
    text: `【${poolName}】
${resultText}

来「天机抽卡」一起探索命运吧！`,
  };
}
