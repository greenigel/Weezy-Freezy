import re

with open('src/components/OverviewTab.tsx', 'r') as f:
    content = f.read()

old_use_effect = """  useEffect(() => {
    fetch("/api/webcam/info")
      .then(res => res.json())
      .then(data => {
        if (data.lastModified) {
          setWebcamTime(new Date(data.lastModified));
        }
      })
      .catch(e => console.error(e));
  }, []);"""

new_use_effect = """  useEffect(() => {
    const fetchInfo = () => {
      fetch("/api/webcam/info")
        .then(res => res.json())
        .then(data => {
          if (data.lastModified) {
            setWebcamTime(new Date(data.lastModified));
            setImageError(false);
          }
        })
        .catch(e => console.error(e));
    };
    
    fetchInfo();
    const interval = setInterval(fetchInfo, 10000);
    return () => clearInterval(interval);
  }, []);"""

content = content.replace(old_use_effect, new_use_effect)

img_old = """<img 
                src={`/api/webcam?t=${now.getTime()}`}"""

img_new = """<img 
                src={`/api/webcam?t=${webcamTime ? webcamTime.getTime() : now.getTime()}`}"""

content = content.replace(img_old, img_new)

with open('src/components/OverviewTab.tsx', 'w') as f:
    f.write(content)
