import re

with open('src/components/OverviewTab.tsx', 'r') as f:
    content = f.read()

state_inject = """  const [imageError, setImageError] = useState(false);
  const [webcamTime, setWebcamTime] = useState<Date | null>(null);

  useEffect(() => {
    fetch("/api/webcam/info")
      .then(res => res.json())
      .then(data => {
        if (data.lastModified) {
          setWebcamTime(new Date(data.lastModified));
        }
      })
      .catch(e => console.error(e));
  }, []);"""

content = content.replace("  const [imageError, setImageError] = useState(false);", state_inject)

old_time = """<p className="text-xs text-slate-400">{now.toLocaleDateString("de-DE")} {now.toLocaleTimeString("de-DE")}</p>"""
new_time = """<p className="text-xs text-slate-400">{webcamTime ? `${webcamTime.toLocaleDateString("de-DE")} ${webcamTime.toLocaleTimeString("de-DE")}` : 'Lädt...'}</p>"""

content = content.replace(old_time, new_time)

with open('src/components/OverviewTab.tsx', 'w') as f:
    f.write(content)
