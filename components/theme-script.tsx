const source = `(()=>{try{const s=localStorage.getItem("mrm-theme");const p=s==="light"||s==="dark"?s:"system";const t=p==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):p;const d=document.documentElement;d.dataset.theme=t;d.dataset.themePreference=p;d.style.colorScheme=t}catch{}})()`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: source }} />;
}
